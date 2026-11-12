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

// Files a report through the real API, the way a user would.
async function fileReport(reporterToken, target, reason = 'SPAM', description = '') {
  const res = await api()
    .post('/api/reports')
    .set(bearer(reporterToken))
    .send({ ...target, reason, description });
  assert.equal(res.status, 201);
  return res.body.data.report;
}

async function setupJobReport() {
  const category = await createCategory();
  const poster = await createUser({ role: 'POSTER' });
  const job = await createJob({ poster: poster.user._id, category: category._id });
  const reporter = await createUser({ role: 'STUDENT' });
  const report = await fileReport(reporter.token, { targetType: 'JOB', targetId: job.id }, 'SCAM_OR_FRAUD', 'Asks for money upfront.');
  return { job, poster, reporter, report };
}

describe('Admin: reports', () => {
  before(setupDatabase);
  beforeEach(clearDatabase);
  after(teardownDatabase);

  describe('GET /api/admin/reports', () => {
    it('shows a job report with reporter and target details', async () => {
      const admin = await createUser({ role: 'ADMIN' });
      const { job, reporter } = await setupJobReport();

      const res = await api().get('/api/admin/reports').set(bearer(admin.token));

      assert.equal(res.status, 200);
      const [report] = res.body.data.reports;
      assert.ok(report.id);
      assert.equal(report._id, undefined);
      assert.equal(report.status, 'PENDING');
      assert.equal(report.reason, 'SCAM_OR_FRAUD');
      assert.equal(report.description, 'Asks for money upfront.');
      assert.equal(report.reporter.email, reporter.user.email);
      assert.equal(report.target.kind, 'JOB');
      assert.equal(report.target.id, job.id);
      assert.equal(report.target.label, job.title);
      assert.equal(report.resolvedBy, null);
    });

    it('shows a user report with the reported person\u2019s details', async () => {
      const admin = await createUser({ role: 'ADMIN' });
      const reporter = await createUser({ role: 'POSTER' });
      const student = await createUser({ role: 'STUDENT', name: 'Farhana Akter' });
      await fileReport(reporter.token, { targetType: 'USER', targetId: student.user.id }, 'FAKE_PROFILE');

      const res = await api().get('/api/admin/reports').set(bearer(admin.token));
      const [report] = res.body.data.reports;
      assert.equal(report.target.kind, 'USER');
      assert.equal(report.target.label, 'Farhana Akter');
      assert.equal(report.target.email, student.user.email);
      assert.equal(report.target.status, 'ACTIVE');
    });

    it('filters by status, with OPEN meaning pending or under review', async () => {
      const admin = await createUser({ role: 'ADMIN' });
      const first = await setupJobReport();
      await setupJobReport();
      await api().post(`/api/admin/reports/${first.report.id}/dismiss`).set(bearer(admin.token)).send({});

      const open = await api().get('/api/admin/reports?status=OPEN').set(bearer(admin.token));
      assert.equal(open.body.data.reports.length, 1);
      const dismissed = await api().get('/api/admin/reports?status=DISMISSED').set(bearer(admin.token));
      assert.equal(dismissed.body.data.reports.length, 1);
      const all = await api().get('/api/admin/reports').set(bearer(admin.token));
      assert.equal(all.body.data.reports.length, 2);
      assert.equal(all.body.data.pagination.total, 2);
    });

    it('still lists a report whose job was deleted', async () => {
      const admin = await createUser({ role: 'ADMIN' });
      const { job } = await setupJobReport();
      await Job.deleteOne({ _id: job._id });

      const res = await api().get('/api/admin/reports').set(bearer(admin.token));
      assert.equal(res.status, 200);
      assert.equal(res.body.data.reports[0].target.label, '(deleted job)');
    });

    it('rejects an invalid status filter and non-admins', async () => {
      const admin = await createUser({ role: 'ADMIN' });
      const bad = await api().get('/api/admin/reports?status=WHATEVER').set(bearer(admin.token));
      assert.equal(bad.status, 400);

      const { token } = await createUser({ role: 'POSTER' });
      const forbidden = await api().get('/api/admin/reports').set(bearer(token));
      assert.equal(forbidden.status, 403);
      const anonymous = await api().get('/api/admin/reports');
      assert.equal(anonymous.status, 401);
    });
  });

  describe('report actions', () => {
    it('moves a pending report to REVIEWING, and only once', async () => {
      const admin = await createUser({ role: 'ADMIN' });
      const { report } = await setupJobReport();

      const res = await api().post(`/api/admin/reports/${report.id}/review`).set(bearer(admin.token));
      assert.equal(res.status, 200);
      assert.equal(res.body.data.report.status, 'REVIEWING');
      assert.equal(res.body.data.report.resolvedAt, null);

      const again = await api().post(`/api/admin/reports/${report.id}/review`).set(bearer(admin.token));
      assert.equal(again.status, 409);
    });

    it('resolves a report, recording who, when, and the note', async () => {
      const admin = await createUser({ role: 'ADMIN' });
      const { report } = await setupJobReport();

      const res = await api()
        .post(`/api/admin/reports/${report.id}/resolve`)
        .set(bearer(admin.token))
        .send({ note: 'Job removed for asking for money.' });

      assert.equal(res.status, 200);
      const resolved = res.body.data.report;
      assert.equal(resolved.status, 'RESOLVED');
      assert.equal(resolved.resolutionNote, 'Job removed for asking for money.');
      assert.equal(resolved.resolvedBy.id, admin.user.id);
      assert.ok(resolved.resolvedAt);
    });

    it('dismisses a report that is under review', async () => {
      const admin = await createUser({ role: 'ADMIN' });
      const { report } = await setupJobReport();
      await api().post(`/api/admin/reports/${report.id}/review`).set(bearer(admin.token));

      const res = await api().post(`/api/admin/reports/${report.id}/dismiss`).set(bearer(admin.token)).send({ note: 'No problem found.' });
      assert.equal(res.status, 200);
      assert.equal(res.body.data.report.status, 'DISMISSED');
    });

    it('does not allow changing a report that is already closed', async () => {
      const admin = await createUser({ role: 'ADMIN' });
      const { report } = await setupJobReport();
      await api().post(`/api/admin/reports/${report.id}/resolve`).set(bearer(admin.token)).send({});

      for (const action of ['review', 'resolve', 'dismiss']) {
        const res = await api().post(`/api/admin/reports/${report.id}/${action}`).set(bearer(admin.token)).send({});
        assert.equal(res.status, 409, `expected 409 for ${action}`);
      }
      assert.equal((await Report.findById(report.id)).status, 'RESOLVED');
    });

    it('keeps blocking a duplicate report while it is open, and allows a new one once it is closed', async () => {
      const admin = await createUser({ role: 'ADMIN' });
      const { job, reporter, report } = await setupJobReport();
      const target = { targetType: 'JOB', targetId: job.id, reason: 'SPAM' };

      await api().post(`/api/admin/reports/${report.id}/review`).set(bearer(admin.token));
      const whileOpen = await api().post('/api/reports').set(bearer(reporter.token)).send(target);
      assert.equal(whileOpen.status, 409);

      await api().post(`/api/admin/reports/${report.id}/resolve`).set(bearer(admin.token)).send({});
      const afterClose = await api().post('/api/reports').set(bearer(reporter.token)).send(target);
      assert.equal(afterClose.status, 201);
    });

    it('rejects a note that is too long and ignores status or resolvedBy sent in the body', async () => {
      const admin = await createUser({ role: 'ADMIN' });
      const { report, reporter } = await setupJobReport();

      const tooLong = await api().post(`/api/admin/reports/${report.id}/resolve`).set(bearer(admin.token)).send({ note: 'x'.repeat(1001) });
      assert.equal(tooLong.status, 400);
      assert.ok(tooLong.body.errors.some((e) => e.field === 'note'));

      const res = await api()
        .post(`/api/admin/reports/${report.id}/dismiss`)
        .set(bearer(admin.token))
        .send({ note: 'Fine.', status: 'RESOLVED', resolvedBy: reporter.user.id });
      assert.equal(res.body.data.report.status, 'DISMISSED');
      assert.equal(res.body.data.report.resolvedBy.id, admin.user.id);
    });

    it('returns 404 for an unknown report, 400 for a bad id, and 403 for non-admins', async () => {
      const admin = await createUser({ role: 'ADMIN' });
      const unknown = await api().post('/api/admin/reports/507f1f77bcf86cd799439011/resolve').set(bearer(admin.token)).send({});
      assert.equal(unknown.status, 404);
      const bad = await api().post('/api/admin/reports/nope/resolve').set(bearer(admin.token)).send({});
      assert.equal(bad.status, 400);

      const { report, reporter } = await setupJobReport();
      const byReporter = await api().post(`/api/admin/reports/${report.id}/resolve`).set(bearer(reporter.token)).send({});
      assert.equal(byReporter.status, 403);
      assert.equal((await Report.findById(report.id)).status, 'PENDING');
    });
  });
});
