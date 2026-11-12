const { api, bearer, createUser, setupDatabase, clearDatabase, teardownDatabase } = require('./helpers/testApp');
const { describe, it, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const User = require('../src/models/User');

describe('Role-based authorization', () => {
  before(setupDatabase);
  beforeEach(clearDatabase);
  after(teardownDatabase);

  describe('Admin-only routes', () => {
    it('rejects a request with no token (401)', async () => {
      const res = await api().get('/api/admin/stats');
      assert.equal(res.status, 401);
    });

    it('rejects a student (403)', async () => {
      const { token } = await createUser({ role: 'STUDENT' });
      const res = await api().get('/api/admin/stats').set(bearer(token));
      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
    });

    it('rejects a poster (403)', async () => {
      const { token } = await createUser({ role: 'POSTER' });
      const res = await api().get('/api/admin/stats').set(bearer(token));
      assert.equal(res.status, 403);
    });

    it('allows an admin and returns correct counts', async () => {
      const { token } = await createUser({ role: 'ADMIN' });
      await createUser({ role: 'STUDENT' });
      await createUser({ role: 'STUDENT' });
      await createUser({ role: 'POSTER' });

      const res = await api().get('/api/admin/stats').set(bearer(token));

      assert.equal(res.status, 200);
      // The user counts keep their original names; Increment 6 added more counts beside them
      // (see adminStats.test.js).
      assert.equal(res.body.data.stats.totalUsers, 4);
      assert.equal(res.body.data.stats.students, 2);
      assert.equal(res.body.data.stats.posters, 1);
    });
  });

  describe('Profile ownership', () => {
    it('a student cannot edit another student’s profile', async () => {
      const owner = await createUser({ role: 'STUDENT', bio: 'Original bio' });
      const attacker = await createUser({ role: 'STUDENT' });

      const res = await api()
        .put(`/api/students/${owner.user.id}`)
        .set(bearer(attacker.token))
        .send({ bio: 'Hacked' });

      assert.equal(res.status, 403);
      const unchanged = await User.findById(owner.user._id);
      assert.equal(unchanged.bio, 'Original bio');
    });

    it('a poster cannot edit another poster’s profile', async () => {
      const owner = await createUser({ role: 'POSTER', bio: 'Original description' });
      const attacker = await createUser({ role: 'POSTER' });

      const res = await api()
        .put(`/api/posters/${owner.user.id}`)
        .set(bearer(attacker.token))
        .send({ bio: 'Hacked' });

      assert.equal(res.status, 403);
      assert.equal((await User.findById(owner.user._id)).bio, 'Original description');
    });

    it('a poster cannot use the student profile endpoint, even on their own id', async () => {
      const { user, token } = await createUser({ role: 'POSTER' });
      const res = await api().put(`/api/students/${user.id}`).set(bearer(token)).send({ bio: 'x' });
      assert.equal(res.status, 403);
    });

    it('a student cannot use the poster profile endpoint, even on their own id', async () => {
      const { user, token } = await createUser({ role: 'STUDENT' });
      const res = await api().put(`/api/posters/${user.id}`).set(bearer(token)).send({ bio: 'x' });
      assert.equal(res.status, 403);
    });

    it('an admin cannot edit a student profile through the student endpoint', async () => {
      const student = await createUser({ role: 'STUDENT' });
      const admin = await createUser({ role: 'ADMIN' });
      const res = await api()
        .put(`/api/students/${student.user.id}`)
        .set(bearer(admin.token))
        .send({ bio: 'x' });
      assert.equal(res.status, 403);
    });

    it('rejects attempts to change role, email, or status through a profile update (400)', async () => {
      const { user, token } = await createUser({ role: 'STUDENT' });

      for (const forbidden of [{ role: 'ADMIN' }, { email: 'new@campusgig.test' }, { status: 'ACTIVE' }, { ratingSummary: { average: 5, count: 10 } }]) {
        const res = await api().put(`/api/students/${user.id}`).set(bearer(token)).send(forbidden);
        assert.equal(res.status, 400, `expected 400 for ${JSON.stringify(forbidden)}`);
      }

      const unchanged = await User.findById(user._id);
      assert.equal(unchanged.role, 'STUDENT');
      assert.equal(unchanged.email, user.email);
    });
  });
});
