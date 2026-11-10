const {
  api,
  bearer,
  createUser,
  createJob,
  createCategory,
  setupDatabase,
  clearDatabase,
  teardownDatabase,
} = require('./helpers/testApp');
const { describe, it, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const Job = require('../src/models/Job');
const Report = require('../src/models/Report');
const User = require('../src/models/User');

const REPORTS_URL = '/api/reports';

async function setupJob(jobOverrides = {}) {
  const category = await createCategory();
  const posterAuth = await createUser({ role: 'POSTER' });
  const job = await createJob({ poster: posterAuth.user._id, category: category._id, ...jobOverrides });
  return { job, poster: posterAuth.user, posterToken: posterAuth.token };
}

describe('Reports', () => {
  before(setupDatabase);
  beforeEach(clearDatabase);
  after(teardownDatabase);

  describe('POST /api/reports', () => {
    it('lets a student report a job', async () => {
      const { job } = await setupJob();
      const { token } = await createUser({ role: 'STUDENT' });

      const res = await api()
        .post(REPORTS_URL)
        .set(bearer(token))
        .send({ targetType: 'JOB', targetId: job.id, reason: 'SCAM_OR_FRAUD', description: 'Asks for money upfront.' });

      assert.equal(res.status, 201);
      const { report } = res.body.data;
      assert.ok(report.id);
      assert.equal(report._id, undefined);
      assert.equal(report.isActive, undefined);
      assert.equal(report.targetType, 'JOB');
      assert.equal(report.targetJob, job.id);
      assert.equal(report.status, 'PENDING');
      assert.equal(report.reason, 'SCAM_OR_FRAUD');
    });

    it('lets a poster report a user', async () => {
      const { user: student } = await createUser({ role: 'STUDENT' });
      const { token } = await createUser({ role: 'POSTER' });

      const res = await api()
        .post(REPORTS_URL)
        .set(bearer(token))
        .send({ targetType: 'USER', targetId: student.id, reason: 'HARASSMENT' });

      assert.equal(res.status, 201);
      assert.equal(res.body.data.report.targetUser, student.id);
      assert.equal(res.body.data.report.description, '');
    });

    it('rejects a second active report against the same target', async () => {
      const { job } = await setupJob();
      const { token } = await createUser({ role: 'STUDENT' });
      const body = { targetType: 'JOB', targetId: job.id, reason: 'SPAM' };

      const first = await api().post(REPORTS_URL).set(bearer(token)).send(body);
      const second = await api().post(REPORTS_URL).set(bearer(token)).send({ ...body, reason: 'HARASSMENT' });

      assert.equal(first.status, 201);
      assert.equal(second.status, 409);
      assert.equal(await Report.countDocuments({}), 1);
    });

    it('allows different people to report the same target, and one person to report different targets', async () => {
      const { job } = await setupJob();
      const { job: otherJob } = await setupJob();
      const alice = await createUser({ role: 'STUDENT' });
      const bob = await createUser({ role: 'STUDENT' });

      const a = await api().post(REPORTS_URL).set(bearer(alice.token)).send({ targetType: 'JOB', targetId: job.id, reason: 'SPAM' });
      const b = await api().post(REPORTS_URL).set(bearer(bob.token)).send({ targetType: 'JOB', targetId: job.id, reason: 'SPAM' });
      const c = await api().post(REPORTS_URL).set(bearer(alice.token)).send({ targetType: 'JOB', targetId: otherJob.id, reason: 'SPAM' });

      assert.deepEqual([a.status, b.status, c.status], [201, 201, 201]);
    });

    it('allows reporting the same target again once the earlier report is resolved', async () => {
      const { job } = await setupJob();
      const { token } = await createUser({ role: 'STUDENT' });
      const body = { targetType: 'JOB', targetId: job.id, reason: 'SPAM' };
      await api().post(REPORTS_URL).set(bearer(token)).send(body);

      // Increment 6 will resolve reports through document.save(), which keeps isActive in step.
      const existing = await Report.findOne({});
      existing.status = 'RESOLVED';
      await existing.save();

      const again = await api().post(REPORTS_URL).set(bearer(token)).send(body);
      assert.equal(again.status, 201);
      assert.equal(await Report.countDocuments({}), 2);
    });

    it('rejects reporting your own job or yourself', async () => {
      const { job, posterToken, poster } = await setupJob();

      const ownJob = await api().post(REPORTS_URL).set(bearer(posterToken)).send({ targetType: 'JOB', targetId: job.id, reason: 'SPAM' });
      assert.equal(ownJob.status, 400);

      const self = await api().post(REPORTS_URL).set(bearer(posterToken)).send({ targetType: 'USER', targetId: poster.id, reason: 'SPAM' });
      assert.equal(self.status, 400);
      assert.equal(await Report.countDocuments({}), 0);
    });

    it('returns 404 for targets the reporter could not see', async () => {
      const { token } = await createUser({ role: 'STUDENT' });
      const admin = await createUser({ role: 'ADMIN' });
      const suspendedUser = await createUser({ role: 'STUDENT', status: 'SUSPENDED' });
      const removed = await setupJob();
      await Job.updateOne({ _id: removed.job._id }, { removedByAdmin: true });
      const suspendedPoster = await setupJob();
      await User.updateOne({ _id: suspendedPoster.poster._id }, { status: 'SUSPENDED' });

      const targets = [
        { targetType: 'USER', targetId: admin.user.id },
        { targetType: 'USER', targetId: suspendedUser.user.id },
        { targetType: 'USER', targetId: '507f1f77bcf86cd799439011' },
        { targetType: 'JOB', targetId: removed.job.id },
        { targetType: 'JOB', targetId: suspendedPoster.job.id },
        { targetType: 'JOB', targetId: '507f1f77bcf86cd799439011' },
      ];
      for (const target of targets) {
        const res = await api().post(REPORTS_URL).set(bearer(token)).send({ ...target, reason: 'SPAM' });
        assert.equal(res.status, 404, `expected 404 for ${JSON.stringify(target)}`);
      }
    });

    it('validates the target type, id, and reason', async () => {
      const { token } = await createUser({ role: 'STUDENT' });
      const validId = '507f1f77bcf86cd799439011';

      const cases = [
        [{ targetType: 'REVIEW', targetId: validId, reason: 'SPAM' }, 'targetType'],
        [{ targetType: 'JOB', targetId: 'nope', reason: 'SPAM' }, 'targetId'],
        [{ targetType: 'JOB', targetId: validId, reason: 'BORING' }, 'reason'],
        [{ targetType: 'JOB', targetId: validId }, 'reason'],
        [{ targetType: 'JOB', targetId: validId, reason: 'SPAM', description: 'x'.repeat(1001) }, 'description'],
      ];
      for (const [body, field] of cases) {
        const res = await api().post(REPORTS_URL).set(bearer(token)).send(body);
        assert.equal(res.status, 400, `expected 400 for ${JSON.stringify(body).slice(0, 60)}`);
        assert.ok(res.body.errors.some((e) => e.field === field), `expected an error on ${field}`);
      }
    });

    it('needs a description when the reason is OTHER', async () => {
      const { job } = await setupJob();
      const { token } = await createUser({ role: 'STUDENT' });

      const without = await api().post(REPORTS_URL).set(bearer(token)).send({ targetType: 'JOB', targetId: job.id, reason: 'OTHER' });
      assert.equal(without.status, 400);
      assert.ok(without.body.errors.some((e) => e.field === 'description'));

      const withText = await api()
        .post(REPORTS_URL)
        .set(bearer(token))
        .send({ targetType: 'JOB', targetId: job.id, reason: 'OTHER', description: 'The job asks me to share my bank password.' });
      assert.equal(withText.status, 201);
    });

    it('ignores status and resolution fields sent by the caller', async () => {
      const { job } = await setupJob();
      const { token, user } = await createUser({ role: 'STUDENT' });

      const res = await api()
        .post(REPORTS_URL)
        .set(bearer(token))
        .send({ targetType: 'JOB', targetId: job.id, reason: 'SPAM', status: 'RESOLVED', resolvedBy: user.id, reporter: job.id });

      assert.equal(res.status, 201);
      assert.equal(res.body.data.report.status, 'PENDING');
      assert.equal(res.body.data.report.resolvedBy, null);
      assert.equal(res.body.data.report.reporter, user.id);
    });

    it('requires authentication and rejects admins', async () => {
      const { job } = await setupJob();
      const body = { targetType: 'JOB', targetId: job.id, reason: 'SPAM' };

      const anonymous = await api().post(REPORTS_URL).send(body);
      assert.equal(anonymous.status, 401);

      const admin = await createUser({ role: 'ADMIN' });
      const asAdmin = await api().post(REPORTS_URL).set(bearer(admin.token)).send(body);
      assert.equal(asAdmin.status, 403);
    });
  });
});
