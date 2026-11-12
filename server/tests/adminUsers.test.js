const {
  api,
  bearer,
  createUser,
  createJob,
  createCategory,
  setupDatabase,
  clearDatabase,
  teardownDatabase,
  TEST_PASSWORD,
} = require('./helpers/testApp');
const { describe, it, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const User = require('../src/models/User');

describe('Admin: users', () => {
  before(setupDatabase);
  beforeEach(clearDatabase);
  after(teardownDatabase);

  describe('GET /api/admin/users', () => {
    it('lists users with email and status, and never leaks password hashes', async () => {
      const admin = await createUser({ role: 'ADMIN' });
      await createUser({ role: 'STUDENT', name: 'Nusrat Jahan' });

      const res = await api().get('/api/admin/users').set(bearer(admin.token));

      assert.equal(res.status, 200);
      assert.equal(res.body.data.users.length, 2);
      const student = res.body.data.users.find((u) => u.role === 'STUDENT');
      assert.ok(student.id);
      assert.equal(student._id, undefined);
      assert.ok(student.email.includes('@'));
      assert.equal(student.status, 'ACTIVE');
      assert.equal(student.passwordHash, undefined);
      assert.equal(student.profileCompletion, undefined);
      assert.deepEqual(res.body.data.pagination, { page: 1, limit: 20, total: 2, totalPages: 1 });
    });

    it('searches by name or email, ignoring case', async () => {
      const admin = await createUser({ role: 'ADMIN' });
      await createUser({ role: 'STUDENT', name: 'Nusrat Jahan' });
      await createUser({ role: 'STUDENT', name: 'Tanvir Ahmed', email: 'findme@campusgig.test' });

      const byName = await api().get('/api/admin/users?search=NUSRAT').set(bearer(admin.token));
      assert.deepEqual(byName.body.data.users.map((u) => u.name), ['Nusrat Jahan']);

      const byEmail = await api().get('/api/admin/users?search=findme').set(bearer(admin.token));
      assert.deepEqual(byEmail.body.data.users.map((u) => u.name), ['Tanvir Ahmed']);
    });

    it('treats special characters in the search literally instead of crashing', async () => {
      const admin = await createUser({ role: 'ADMIN' });
      const res = await api().get('/api/admin/users?search=a%2B(b').set(bearer(admin.token));
      assert.equal(res.status, 200);
      assert.equal(res.body.data.users.length, 0);
    });

    it('filters by role and status', async () => {
      const admin = await createUser({ role: 'ADMIN' });
      await createUser({ role: 'STUDENT' });
      await createUser({ role: 'POSTER' });
      await createUser({ role: 'STUDENT', status: 'SUSPENDED' });

      const posters = await api().get('/api/admin/users?role=POSTER').set(bearer(admin.token));
      assert.equal(posters.body.data.users.length, 1);

      const suspended = await api().get('/api/admin/users?status=SUSPENDED').set(bearer(admin.token));
      assert.equal(suspended.body.data.users.length, 1);
      assert.equal(suspended.body.data.users[0].status, 'SUSPENDED');
    });

    it('paginates', async () => {
      const admin = await createUser({ role: 'ADMIN' });
      for (let i = 0; i < 5; i += 1) await createUser({ role: 'STUDENT' });

      const res = await api().get('/api/admin/users?limit=4&page=2').set(bearer(admin.token));
      assert.equal(res.body.data.users.length, 2);
      assert.deepEqual(res.body.data.pagination, { page: 2, limit: 4, total: 6, totalPages: 2 });
    });

    it('rejects an invalid role filter', async () => {
      const admin = await createUser({ role: 'ADMIN' });
      const res = await api().get('/api/admin/users?role=KING').set(bearer(admin.token));
      assert.equal(res.status, 400);
    });

    it('requires an admin', async () => {
      const anonymous = await api().get('/api/admin/users');
      assert.equal(anonymous.status, 401);
      for (const role of ['STUDENT', 'POSTER']) {
        const { token } = await createUser({ role });
        const res = await api().get('/api/admin/users').set(bearer(token));
        assert.equal(res.status, 403);
      }
    });
  });

  describe('POST /api/admin/users/:id/suspend', () => {
    it('suspends a user, who is then blocked immediately', async () => {
      const admin = await createUser({ role: 'ADMIN' });
      const student = await createUser({ role: 'STUDENT' });

      const res = await api().post(`/api/admin/users/${student.user.id}/suspend`).set(bearer(admin.token));
      assert.equal(res.status, 200);
      assert.equal(res.body.data.user.status, 'SUSPENDED');
      assert.equal((await User.findById(student.user._id)).status, 'SUSPENDED');

      // The token they already hold stops working on their very next request.
      const me = await api().get('/api/auth/me').set(bearer(student.token));
      assert.equal(me.status, 403);
      assert.equal(me.body.code, 'ACCOUNT_SUSPENDED');

      // And they cannot log in again.
      const login = await api().post('/api/auth/login').send({ email: student.user.email, password: TEST_PASSWORD });
      assert.equal(login.status, 403);
      assert.equal(login.body.code, 'ACCOUNT_SUSPENDED');
    });

    it('hides a suspended poster\u2019s open jobs from the public until reactivated', async () => {
      const admin = await createUser({ role: 'ADMIN' });
      const poster = await createUser({ role: 'POSTER' });
      const category = await createCategory();
      const job = await createJob({ poster: poster.user._id, category: category._id });

      await api().post(`/api/admin/users/${poster.user.id}/suspend`).set(bearer(admin.token));
      const hiddenList = await api().get('/api/jobs');
      assert.equal(hiddenList.body.data.jobs.length, 0);
      const hiddenDetails = await api().get(`/api/jobs/${job.id}`);
      assert.equal(hiddenDetails.status, 404);

      await api().post(`/api/admin/users/${poster.user.id}/reactivate`).set(bearer(admin.token));
      const visibleList = await api().get('/api/jobs');
      assert.equal(visibleList.body.data.jobs.length, 1);
    });

    it('rejects suspending someone who is already suspended', async () => {
      const admin = await createUser({ role: 'ADMIN' });
      const student = await createUser({ role: 'STUDENT', status: 'SUSPENDED' });
      const res = await api().post(`/api/admin/users/${student.user.id}/suspend`).set(bearer(admin.token));
      assert.equal(res.status, 409);
    });

    it('never suspends an admin, including the caller', async () => {
      const admin = await createUser({ role: 'ADMIN' });
      const other = await createUser({ role: 'ADMIN' });

      const self = await api().post(`/api/admin/users/${admin.user.id}/suspend`).set(bearer(admin.token));
      assert.equal(self.status, 400);
      const colleague = await api().post(`/api/admin/users/${other.user.id}/suspend`).set(bearer(admin.token));
      assert.equal(colleague.status, 400);
      assert.equal((await User.findById(other.user._id)).status, 'ACTIVE');
    });

    it('returns 404 for an unknown user and 400 for a malformed id', async () => {
      const admin = await createUser({ role: 'ADMIN' });
      const unknown = await api().post('/api/admin/users/507f1f77bcf86cd799439011/suspend').set(bearer(admin.token));
      assert.equal(unknown.status, 404);
      const malformed = await api().post('/api/admin/users/nope/suspend').set(bearer(admin.token));
      assert.equal(malformed.status, 400);
    });

    it('is not available to students or posters', async () => {
      const victim = await createUser({ role: 'STUDENT' });
      for (const role of ['STUDENT', 'POSTER']) {
        const { token } = await createUser({ role });
        const res = await api().post(`/api/admin/users/${victim.user.id}/suspend`).set(bearer(token));
        assert.equal(res.status, 403);
      }
      assert.equal((await User.findById(victim.user._id)).status, 'ACTIVE');
    });
  });

  describe('POST /api/admin/users/:id/reactivate', () => {
    it('reactivates a suspended user, who can then log in again', async () => {
      const admin = await createUser({ role: 'ADMIN' });
      const student = await createUser({ role: 'STUDENT', status: 'SUSPENDED' });

      const res = await api().post(`/api/admin/users/${student.user.id}/reactivate`).set(bearer(admin.token));
      assert.equal(res.status, 200);
      assert.equal(res.body.data.user.status, 'ACTIVE');

      const login = await api().post('/api/auth/login').send({ email: student.user.email, password: TEST_PASSWORD });
      assert.equal(login.status, 200);
    });

    it('rejects reactivating a user who is not suspended', async () => {
      const admin = await createUser({ role: 'ADMIN' });
      const student = await createUser({ role: 'STUDENT' });
      const res = await api().post(`/api/admin/users/${student.user.id}/reactivate`).set(bearer(admin.token));
      assert.equal(res.status, 409);
    });
  });
});
