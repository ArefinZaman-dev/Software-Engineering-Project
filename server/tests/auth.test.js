const { api, bearer, createUser, setupDatabase, clearDatabase, teardownDatabase, TEST_PASSWORD } = require('./helpers/testApp');
const { describe, it, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const config = require('../src/config/env');
const User = require('../src/models/User');

const validStudent = {
  role: 'STUDENT',
  name: 'Nusrat Jahan',
  email: 'nusrat@campusgig.test',
  password: 'Strong@123',
  university: 'BUBT',
};

describe('Authentication', () => {
  before(setupDatabase);
  beforeEach(clearDatabase);
  after(teardownDatabase);

  describe('POST /api/auth/register', () => {
    it('creates a student, returns a token, and never exposes the password hash', async () => {
      const res = await api().post('/api/auth/register').send(validStudent);

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.equal(typeof res.body.data.token, 'string');
      assert.equal(res.body.data.user.role, 'STUDENT');
      assert.equal(res.body.data.user.email, 'nusrat@campusgig.test');
      assert.equal(res.body.data.user.studentProfile.university, 'BUBT');
      assert.equal(res.body.data.user.passwordHash, undefined);
      assert.equal(res.body.data.user._id, undefined);
      assert.equal(typeof res.body.data.user.id, 'string');
    });

    it('stores a bcrypt hash, never the plain password', async () => {
      await api().post('/api/auth/register').send(validStudent);
      const stored = await User.findOne({ email: validStudent.email }).select('+passwordHash');

      assert.notEqual(stored.passwordHash, validStudent.password);
      assert.ok(stored.passwordHash.startsWith('$2'));
    });

    it('creates a poster with organization details', async () => {
      const res = await api().post('/api/auth/register').send({
        role: 'POSTER',
        name: 'Sadia Rahman',
        email: 'sadia@campusgig.test',
        password: 'Strong@123',
        organizationType: 'BUSINESS',
        organizationName: 'Riverline Design Studio',
      });

      assert.equal(res.status, 201);
      assert.equal(res.body.data.user.role, 'POSTER');
      assert.equal(res.body.data.user.posterProfile.organizationType, 'BUSINESS');
      assert.equal(res.body.data.user.studentProfile, undefined);
    });

    it('rejects a duplicate email with 409, ignoring upper/lower case', async () => {
      await api().post('/api/auth/register').send(validStudent);
      const res = await api()
        .post('/api/auth/register')
        .send({ ...validStudent, email: 'NUSRAT@campusgig.test' });

      assert.equal(res.status, 409);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /already exists/i);
    });

    it('rejects an invalid email with field-level details', async () => {
      const res = await api().post('/api/auth/register').send({ ...validStudent, email: 'not-an-email' });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.ok(res.body.errors.some((e) => e.field === 'email'));
    });

    it('rejects weak passwords', async () => {
      const tooShort = await api().post('/api/auth/register').send({ ...validStudent, password: 'Ab1' });
      const noNumber = await api().post('/api/auth/register').send({ ...validStudent, password: 'OnlyLetters' });

      assert.equal(tooShort.status, 400);
      assert.equal(noNumber.status, 400);
      assert.ok(noNumber.body.errors.some((e) => e.field === 'password'));
    });

    it('does not allow registering as ADMIN', async () => {
      const res = await api().post('/api/auth/register').send({ ...validStudent, role: 'ADMIN' });

      assert.equal(res.status, 400);
      assert.ok(res.body.errors.some((e) => e.field === 'role'));
      assert.equal(await User.countDocuments(), 0);
    });

    it('ignores fields a caller must not control (status, rating)', async () => {
      const res = await api()
        .post('/api/auth/register')
        .send({ ...validStudent, status: 'SUSPENDED', ratingSummary: { average: 5, count: 99 } });

      assert.equal(res.status, 201);
      assert.equal(res.body.data.user.status, 'ACTIVE');
      assert.equal(res.body.data.user.ratingSummary.count, 0);
    });

    it('returns a clean 400 for malformed JSON', async () => {
      const res = await api()
        .post('/api/auth/register')
        .set('Content-Type', 'application/json')
        .send('{ "email": ');

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
    });
  });

  describe('POST /api/auth/login', () => {
    it('logs in with correct credentials', async () => {
      const { user, password } = await createUser();
      const res = await api().post('/api/auth/login').send({ email: user.email, password });

      assert.equal(res.status, 200);
      assert.equal(typeof res.body.data.token, 'string');
      assert.equal(res.body.data.user.id, user.id);
      assert.equal(res.body.data.user.passwordHash, undefined);
    });

    it('rejects a wrong password with 401', async () => {
      const { user } = await createUser();
      const res = await api().post('/api/auth/login').send({ email: user.email, password: 'Wrong@12345' });

      assert.equal(res.status, 401);
      assert.equal(res.body.message, 'Invalid email or password.');
    });

    it('gives the same 401 message for an unknown email', async () => {
      const res = await api().post('/api/auth/login').send({ email: 'nobody@campusgig.test', password: TEST_PASSWORD });

      assert.equal(res.status, 401);
      assert.equal(res.body.message, 'Invalid email or password.');
    });

    it('blocks a suspended account with 403 and a clear code', async () => {
      const { user, password } = await createUser({ status: 'SUSPENDED' });
      const res = await api().post('/api/auth/login').send({ email: user.email, password });

      assert.equal(res.status, 403);
      assert.equal(res.body.code, 'ACCOUNT_SUSPENDED');
    });

    it('requires both email and password', async () => {
      const res = await api().post('/api/auth/login').send({});

      assert.equal(res.status, 400);
      assert.ok(res.body.errors.some((e) => e.field === 'email'));
      assert.ok(res.body.errors.some((e) => e.field === 'password'));
    });
  });

  describe('Protected routes', () => {
    it('GET /api/auth/me rejects a request without a token', async () => {
      const res = await api().get('/api/auth/me');
      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
    });

    it('rejects a token that is not valid', async () => {
      const res = await api().get('/api/auth/me').set(bearer('not.a.real.token'));
      assert.equal(res.status, 401);
    });

    it('rejects an expired token with a helpful message', async () => {
      const { user } = await createUser();
      const expired = jwt.sign({ sub: String(user._id) }, config.jwtSecret, { expiresIn: -10 });
      const res = await api().get('/api/auth/me').set(bearer(expired));

      assert.equal(res.status, 401);
      assert.match(res.body.message, /expired/i);
    });

    it('returns the current user for a valid token, including profile completion', async () => {
      const { user, token } = await createUser();
      const res = await api().get('/api/auth/me').set(bearer(token));

      assert.equal(res.status, 200);
      assert.equal(res.body.data.user.id, user.id);
      assert.equal(typeof res.body.data.user.profileCompletion.percentage, 'number');
    });

    it('rejects the existing token of a suspended user on the next request', async () => {
      const { user, token } = await createUser();
      await User.updateOne({ _id: user._id }, { status: 'SUSPENDED' });
      const res = await api().get('/api/auth/me').set(bearer(token));

      assert.equal(res.status, 403);
      assert.equal(res.body.code, 'ACCOUNT_SUSPENDED');
    });

    it('rejects the token of a user who no longer exists', async () => {
      const { user, token } = await createUser();
      await User.deleteOne({ _id: user._id });
      const res = await api().get('/api/auth/me').set(bearer(token));

      assert.equal(res.status, 401);
    });

    it('POST /api/auth/logout succeeds for a logged-in user', async () => {
      const { token } = await createUser();
      const res = await api().post('/api/auth/logout').set(bearer(token));
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
    });
  });

  describe('General API behaviour', () => {
    it('GET /api/health responds without a database call', async () => {
      const res = await api().get('/api/health');
      assert.equal(res.status, 200);
      assert.equal(res.body.data.status, 'ok');
    });

    it('unknown routes return a JSON 404', async () => {
      const res = await api().get('/api/does-not-exist');
      assert.equal(res.status, 404);
      assert.equal(res.body.success, false);
    });
  });
});
