const {
  api,
  bearer,
  createUser,
  createHire,
  setupDatabase,
  clearDatabase,
  teardownDatabase,
} = require('./helpers/testApp');
const { describe, it, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const Application = require('../src/models/Application');
const Conversation = require('../src/models/Conversation');
const Message = require('../src/models/Message');
const User = require('../src/models/User');

const openUrl = (applicationId) => `/api/applications/${applicationId}/conversation`;
const messagesUrl = (conversationId) => `/api/conversations/${conversationId}/messages`;

// A hire whose application is in the given status (default SHORTLISTED: messaging is open).
const hireWith = (applicationStatus = 'SHORTLISTED', jobStatus = 'OPEN') =>
  createHire({ applicationStatus, jobStatus });

async function openAs(token, applicationId) {
  const res = await api().post(openUrl(applicationId)).set(bearer(token));
  assert.ok([200, 201].includes(res.status), `could not open conversation: ${res.status}`);
  return res.body.data.conversation;
}

describe('Conversations and messages', () => {
  before(setupDatabase);
  beforeEach(clearDatabase);
  after(teardownDatabase);

  describe('POST /api/applications/:id/conversation', () => {
    it('lets the poster open a conversation for a shortlisted applicant', async () => {
      const { application, student, posterToken } = await hireWith('SHORTLISTED');

      const res = await api().post(openUrl(application.id)).set(bearer(posterToken));

      assert.equal(res.status, 201);
      const { conversation } = res.body.data;
      assert.ok(conversation.id);
      assert.equal(conversation._id, undefined);
      assert.equal(conversation.counterpart.id, student.id);
      assert.equal(conversation.counterpart.email, undefined);
      assert.equal(conversation.counterpart.status, undefined);
      assert.equal(conversation.canSend, true);
      assert.equal(conversation.application.status, 'SHORTLISTED');
    });

    it('lets the accepted student open a conversation with the poster', async () => {
      const { application, poster, studentToken } = await hireWith('ACCEPTED', 'IN_PROGRESS');

      const res = await api().post(openUrl(application.id)).set(bearer(studentToken));

      assert.equal(res.status, 201);
      assert.equal(res.body.data.conversation.counterpart.id, poster.id);
    });

    it('is idempotent: opening twice returns the same conversation', async () => {
      const { application, posterToken, studentToken } = await hireWith('SHORTLISTED');

      const first = await api().post(openUrl(application.id)).set(bearer(posterToken));
      const second = await api().post(openUrl(application.id)).set(bearer(studentToken));

      assert.equal(first.status, 201);
      assert.equal(second.status, 200);
      assert.equal(second.body.data.conversation.id, first.body.data.conversation.id);
      assert.equal(await Conversation.countDocuments({}), 1);
    });

    it('refuses a pending or rejected application', async () => {
      for (const status of ['PENDING', 'REJECTED', 'WITHDRAWN']) {
        const { application, posterToken } = await hireWith(status);
        const res = await api().post(openUrl(application.id)).set(bearer(posterToken));
        assert.equal(res.status, 409, `expected 409 for ${status}`);
      }
      assert.equal(await Conversation.countDocuments({}), 0);
    });

    it('still opens an existing conversation after the application is completed (read-only)', async () => {
      const { application, posterToken } = await hireWith('ACCEPTED', 'IN_PROGRESS');
      await openAs(posterToken, application.id);
      await Application.updateOne({ _id: application._id }, { status: 'COMPLETED' });

      const res = await api().post(openUrl(application.id)).set(bearer(posterToken));
      assert.equal(res.status, 200);
      assert.equal(res.body.data.conversation.canSend, false);
    });

    it('returns 404 for a poster or student who is not on the application', async () => {
      const { application } = await hireWith('SHORTLISTED');
      const strangerPoster = await createUser({ role: 'POSTER' });
      const strangerStudent = await createUser({ role: 'STUDENT' });

      for (const { token } of [strangerPoster, strangerStudent]) {
        const res = await api().post(openUrl(application.id)).set(bearer(token));
        assert.equal(res.status, 404);
      }
    });

    it('returns 404 for an unknown application and 400 for a malformed id', async () => {
      const { token } = await createUser({ role: 'POSTER' });
      const unknown = await api().post(openUrl('507f1f77bcf86cd799439011')).set(bearer(token));
      assert.equal(unknown.status, 404);
      const malformed = await api().post(openUrl('nope')).set(bearer(token));
      assert.equal(malformed.status, 400);
    });

    it('requires authentication and rejects admins', async () => {
      const { application } = await hireWith('SHORTLISTED');
      const anonymous = await api().post(openUrl(application.id));
      assert.equal(anonymous.status, 401);

      const admin = await createUser({ role: 'ADMIN' });
      const asAdmin = await api().post(openUrl(application.id)).set(bearer(admin.token));
      assert.equal(asAdmin.status, 403);
    });

    it('does not open a new conversation with a suspended user', async () => {
      const { application, student, posterToken } = await hireWith('SHORTLISTED');
      await User.updateOne({ _id: student._id }, { status: 'SUSPENDED' });

      const res = await api().post(openUrl(application.id)).set(bearer(posterToken));
      assert.equal(res.status, 404);
    });
  });

  describe('POST /api/conversations/:id/messages', () => {
    it('lets both participants send messages', async () => {
      const { application, student, poster, posterToken, studentToken } = await hireWith('ACCEPTED', 'IN_PROGRESS');
      const conversation = await openAs(posterToken, application.id);

      const fromPoster = await api()
        .post(messagesUrl(conversation.id))
        .set(bearer(posterToken))
        .send({ body: '  Hello, when can you start?  ' });
      const fromStudent = await api()
        .post(messagesUrl(conversation.id))
        .set(bearer(studentToken))
        .send({ body: 'Tomorrow morning works.' });

      assert.equal(fromPoster.status, 201);
      assert.ok(fromPoster.body.data.message.id);
      assert.equal(fromPoster.body.data.message._id, undefined);
      assert.equal(fromPoster.body.data.message.body, 'Hello, when can you start?');
      assert.equal(fromPoster.body.data.message.sender, poster.id);
      assert.equal(fromPoster.body.data.message.readAt, null);
      assert.equal(fromStudent.status, 201);
      assert.equal(fromStudent.body.data.message.sender, student.id);
    });

    it('rejects an empty, whitespace-only, missing, or too long message', async () => {
      const { application, posterToken } = await hireWith('SHORTLISTED');
      const conversation = await openAs(posterToken, application.id);

      for (const body of [{}, { body: '' }, { body: '   ' }, { body: 'x'.repeat(2001) }]) {
        const res = await api().post(messagesUrl(conversation.id)).set(bearer(posterToken)).send(body);
        assert.equal(res.status, 400, `expected 400 for ${JSON.stringify(body).slice(0, 40)}`);
        assert.ok(res.body.errors.some((e) => e.field === 'body'));
      }
      assert.equal(await Message.countDocuments({}), 0);
    });

    it('returns 404 when someone outside the conversation tries to send', async () => {
      const { application, posterToken } = await hireWith('SHORTLISTED');
      const conversation = await openAs(posterToken, application.id);
      const stranger = await createUser({ role: 'STUDENT' });

      const res = await api().post(messagesUrl(conversation.id)).set(bearer(stranger.token)).send({ body: 'Hi' });
      assert.equal(res.status, 404);
      assert.equal(await Message.countDocuments({}), 0);
    });

    it('is read-only once the application is no longer shortlisted or accepted', async () => {
      for (const status of ['COMPLETED', 'WITHDRAWN', 'REJECTED']) {
        const { application, posterToken } = await hireWith('SHORTLISTED');
        const conversation = await openAs(posterToken, application.id);
        await Application.updateOne({ _id: application._id }, { status });

        const send = await api().post(messagesUrl(conversation.id)).set(bearer(posterToken)).send({ body: 'Hello' });
        assert.equal(send.status, 409, `expected 409 for ${status}`);

        const read = await api().get(messagesUrl(conversation.id)).set(bearer(posterToken));
        assert.equal(read.status, 200);
        assert.equal(read.body.data.conversation.canSend, false);
      }
    });

    it('returns 404 when the other participant has been suspended', async () => {
      const { application, student, posterToken } = await hireWith('SHORTLISTED');
      const conversation = await openAs(posterToken, application.id);
      await User.updateOne({ _id: student._id }, { status: 'SUSPENDED' });

      const res = await api().post(messagesUrl(conversation.id)).set(bearer(posterToken)).send({ body: 'Hello' });
      assert.equal(res.status, 404);
    });

    it('requires authentication and a valid id', async () => {
      const anonymous = await api().post(messagesUrl('507f1f77bcf86cd799439011')).send({ body: 'Hi' });
      assert.equal(anonymous.status, 401);

      const { token } = await createUser({ role: 'STUDENT' });
      const badId = await api().post(messagesUrl('nope')).set(bearer(token)).send({ body: 'Hi' });
      assert.equal(badId.status, 400);
    });
  });

  describe('GET /api/conversations/:id/messages', () => {
    it('returns messages oldest first and marks the other persons messages as read', async () => {
      const { application, posterToken, studentToken } = await hireWith('ACCEPTED', 'IN_PROGRESS');
      const conversation = await openAs(posterToken, application.id);
      await api().post(messagesUrl(conversation.id)).set(bearer(posterToken)).send({ body: 'First' });
      await api().post(messagesUrl(conversation.id)).set(bearer(posterToken)).send({ body: 'Second' });

      const res = await api().get(messagesUrl(conversation.id)).set(bearer(studentToken));

      assert.equal(res.status, 200);
      assert.deepEqual(
        res.body.data.messages.map((m) => m.body),
        ['First', 'Second']
      );
      assert.equal(res.body.data.conversation.id, conversation.id);
      assert.equal(await Message.countDocuments({ readAt: null }), 0);
    });

    it('does not mark your own messages as read when you open the thread', async () => {
      const { application, posterToken } = await hireWith('SHORTLISTED');
      const conversation = await openAs(posterToken, application.id);
      await api().post(messagesUrl(conversation.id)).set(bearer(posterToken)).send({ body: 'Hello' });

      await api().get(messagesUrl(conversation.id)).set(bearer(posterToken));
      assert.equal(await Message.countDocuments({ readAt: null }), 1);
    });

    it('returns 404 for someone outside the conversation', async () => {
      const { application, posterToken } = await hireWith('SHORTLISTED');
      const conversation = await openAs(posterToken, application.id);
      const strangerPoster = await createUser({ role: 'POSTER' });

      const res = await api().get(messagesUrl(conversation.id)).set(bearer(strangerPoster.token));
      assert.equal(res.status, 404);
    });
  });

  describe('GET /api/conversations', () => {
    it('lists only my conversations with the last message and an unread count', async () => {
      const { application, posterToken, studentToken } = await hireWith('SHORTLISTED');
      const conversation = await openAs(posterToken, application.id);
      await api().post(messagesUrl(conversation.id)).set(bearer(posterToken)).send({ body: 'Are you free Saturday?' });
      await api().post(messagesUrl(conversation.id)).set(bearer(posterToken)).send({ body: 'Please reply when you can.' });

      // Someone else's conversation must not appear.
      const other = await hireWith('SHORTLISTED');
      await openAs(other.posterToken, other.application.id);

      const forStudent = await api().get('/api/conversations').set(bearer(studentToken));
      assert.equal(forStudent.status, 200);
      assert.equal(forStudent.body.data.conversations.length, 1);
      const [item] = forStudent.body.data.conversations;
      assert.equal(item.id, conversation.id);
      assert.equal(item.unreadCount, 2);
      assert.equal(item.lastMessage.body, 'Please reply when you can.');
      assert.equal(item.lastMessage.sentByMe, false);

      const forPoster = await api().get('/api/conversations').set(bearer(posterToken));
      assert.equal(forPoster.body.data.conversations[0].unreadCount, 0);
      assert.equal(forPoster.body.data.conversations[0].lastMessage.sentByMe, true);
    });

    it('shows a conversation with no messages yet, and puts the most recently active first', async () => {
      const poster = await createUser({ role: 'POSTER' });
      const first = await createHire({ poster, applicationStatus: 'SHORTLISTED', jobStatus: 'OPEN' });
      const second = await createHire({ poster, applicationStatus: 'SHORTLISTED', jobStatus: 'OPEN' });
      const firstConversation = await openAs(poster.token, first.application.id);
      const secondConversation = await openAs(poster.token, second.application.id);

      // Activity in the older conversation moves it to the top.
      await api()
        .post(messagesUrl(firstConversation.id))
        .set(bearer(poster.token))
        .send({ body: 'Bumping this one.' });

      const res = await api().get('/api/conversations').set(bearer(poster.token));
      assert.deepEqual(
        res.body.data.conversations.map((c) => c.id),
        [firstConversation.id, secondConversation.id]
      );
      assert.equal(res.body.data.conversations[1].lastMessage, null);
    });

    it('hides conversations with a suspended user', async () => {
      const { application, student, posterToken } = await hireWith('SHORTLISTED');
      await openAs(posterToken, application.id);
      await User.updateOne({ _id: student._id }, { status: 'SUSPENDED' });

      const res = await api().get('/api/conversations').set(bearer(posterToken));
      assert.equal(res.status, 200);
      assert.equal(res.body.data.conversations.length, 0);
    });

    it('returns an empty list when there are no conversations', async () => {
      const { token } = await createUser({ role: 'STUDENT' });
      const res = await api().get('/api/conversations').set(bearer(token));
      assert.equal(res.status, 200);
      assert.deepEqual(res.body.data.conversations, []);
    });

    it('requires authentication and rejects admins', async () => {
      const anonymous = await api().get('/api/conversations');
      assert.equal(anonymous.status, 401);
      const admin = await createUser({ role: 'ADMIN' });
      const asAdmin = await api().get('/api/conversations').set(bearer(admin.token));
      assert.equal(asAdmin.status, 403);
    });
  });
});
