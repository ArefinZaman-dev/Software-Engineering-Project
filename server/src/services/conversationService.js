const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Application = require('../models/Application');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const { MESSAGEABLE_APPLICATION_STATUSES, ROLES, USER_STATUS } = require('../constants');

const PERSON_FIELDS = 'name role status';
const MESSAGE_WINDOW = 200; // a thread shows its most recent 200 messages
const PREVIEW_LENGTH = 120;

const sameId = (a, b) => String(a) === String(b);

// Loads a conversation and checks `user` is one of its two participants. Returns 404 for
// anyone else (DECISIONS D30) and also when the other participant has been suspended, because
// suspended users are hidden from the platform.
async function loadConversationFor(user, conversationId) {
  const conversation = await Conversation.findById(conversationId)
    .populate('job', 'title status')
    .populate('application', 'status')
    .populate('poster', PERSON_FIELDS)
    .populate('student', PERSON_FIELDS);
  if (!conversation) throw new AppError('Conversation not found.', 404);

  const isPoster = sameId(conversation.poster._id, user._id);
  const isStudent = sameId(conversation.student._id, user._id);
  if (!isPoster && !isStudent) throw new AppError('Conversation not found.', 404);

  const counterpart = isPoster ? conversation.student : conversation.poster;
  if (counterpart.status === USER_STATUS.SUSPENDED) throw new AppError('Conversation not found.', 404);

  return { conversation, counterpart };
}

function canSend(conversation) {
  return MESSAGEABLE_APPLICATION_STATUSES.includes(conversation.application.status);
}

function summarize(conversation, counterpart, extra = {}) {
  return {
    id: conversation.id,
    job: { id: conversation.job.id, title: conversation.job.title, status: conversation.job.status },
    application: { id: conversation.application.id, status: conversation.application.status },
    counterpart: { id: counterpart.id, name: counterpart.name, role: counterpart.role },
    lastMessageAt: conversation.lastMessageAt,
    canSend: canSend(conversation),
    ...extra,
  };
}

// Either participant may open the conversation for an application, but only while that
// application is SHORTLISTED or ACCEPTED (DECISIONS B7). This stops a student from messaging
// a poster they have not been shortlisted by. Opening is idempotent: if the conversation
// already exists it is returned, whatever the application's status is now.
async function openConversation(user, applicationId) {
  const application = await Application.findById(applicationId).populate('job');
  if (!application) throw new AppError('Application not found.', 404);

  const job = application.job;
  const isPoster = sameId(job.poster, user._id);
  const isStudent = sameId(application.student, user._id);
  if (!isPoster && !isStudent) throw new AppError('Application not found.', 404);

  let created = false;
  let conversation = await Conversation.findOne({ application: application._id });

  if (!conversation) {
    if (!MESSAGEABLE_APPLICATION_STATUSES.includes(application.status)) {
      throw new AppError('Messaging opens once an applicant has been shortlisted or accepted.', 409);
    }
    const counterpart = await User.findById(isPoster ? application.student : job.poster).select('status');
    if (!counterpart || counterpart.status === USER_STATUS.SUSPENDED) {
      throw new AppError('Application not found.', 404);
    }

    try {
      conversation = await Conversation.create({
        job: job._id,
        application: application._id,
        poster: job.poster,
        student: application.student,
      });
      created = true;
    } catch (error) {
      // Race guard: the unique index on `application` means the other request won.
      if (error.code !== 11000) throw error;
      conversation = await Conversation.findOne({ application: application._id });
    }
  }

  const loaded = await loadConversationFor(user, conversation._id);
  return { conversation: summarize(loaded.conversation, loaded.counterpart), created };
}

// The caller's conversations, newest activity first, each with the last message and the number
// of messages from the other person that this user has not opened yet.
async function listConversations(user) {
  const isPoster = user.role === ROLES.POSTER;
  const filter = isPoster ? { poster: user._id } : { student: user._id };
  const conversations = await Conversation.find(filter)
    .sort({ lastMessageAt: -1 })
    .populate('job', 'title status')
    .populate('application', 'status')
    .populate('poster', PERSON_FIELDS)
    .populate('student', PERSON_FIELDS);

  const visible = conversations
    .map((conversation) => ({
      conversation,
      counterpart: isPoster ? conversation.student : conversation.poster,
    }))
    .filter(({ counterpart }) => counterpart.status !== USER_STATUS.SUSPENDED);

  // One aggregation for every thread's last message and unread count (instead of 2 queries
  // per conversation).
  const stats = visible.length
    ? await Message.aggregate([
        { $match: { conversation: { $in: visible.map(({ conversation }) => conversation._id) } } },
        { $sort: { createdAt: -1 } },
        {
          $group: {
            _id: '$conversation',
            body: { $first: '$body' },
            sender: { $first: '$sender' },
            createdAt: { $first: '$createdAt' },
            unreadCount: {
              $sum: { $cond: [{ $and: [{ $ne: ['$sender', user._id] }, { $eq: ['$readAt', null] }] }, 1, 0] },
            },
          },
        },
      ])
    : [];
  const statsById = new Map(stats.map((entry) => [String(entry._id), entry]));

  return visible.map(({ conversation, counterpart }) => {
    const entry = statsById.get(String(conversation._id));
    return summarize(conversation, counterpart, {
      unreadCount: entry ? entry.unreadCount : 0,
      lastMessage: entry
        ? {
            body: entry.body.length > PREVIEW_LENGTH ? `${entry.body.slice(0, PREVIEW_LENGTH)}...` : entry.body,
            sentByMe: sameId(entry.sender, user._id),
            createdAt: entry.createdAt,
          }
        : null,
    });
  });
}

// Opening a thread marks the other person's messages as read.
async function getMessages(user, conversationId) {
  const { conversation, counterpart } = await loadConversationFor(user, conversationId);

  await Message.updateMany(
    { conversation: conversation._id, sender: { $ne: user._id }, readAt: null },
    { readAt: new Date() }
  );

  const latest = await Message.find({ conversation: conversation._id }).sort({ createdAt: -1 }).limit(MESSAGE_WINDOW);
  return { conversation: summarize(conversation, counterpart), messages: latest.reverse() };
}

async function sendMessage(user, conversationId, body) {
  const { conversation } = await loadConversationFor(user, conversationId);
  if (!canSend(conversation)) {
    throw new AppError('This conversation is read-only because the application is no longer active.', 409);
  }

  const message = await Message.create({ conversation: conversation._id, sender: user._id, body });
  await Conversation.updateOne({ _id: conversation._id }, { lastMessageAt: message.createdAt });
  return message;
}

module.exports = { openConversation, listConversations, getMessages, sendMessage };
