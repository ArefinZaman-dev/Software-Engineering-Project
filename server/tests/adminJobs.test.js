const {
  api,
  bearer,
  createUser,
  createHire,
  createJob,
  createCategory,
  setupDatabase,
  clearDatabase,
  teardownDatabase,
} = require('./helpers/testApp');
const { describe, it, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const Job = require('../src/models/Job');
const Application = require('../src/models/Application');

async function setupJob(overrides = {}) {
  const category = await createCategory();
  const poster = await createUser({ role: 'POSTER' });
  const job = await createJob({ poster: poster.user._id, category: category._id, ...overrides });
  return { job, poster, category };
}

describe('Admin: jobs', () => {
  before(setupDatabase);
  beforeEach(clearDatabase);
  after(teardownDatabase);

  describe('GET /api/admin/jobs', () => {
    it('lists every job with its poster, category and removed flag', async () => {
      const admin = await createUser({ role: 'ADMIN' });
      const { job, poster, category } = await setupJob({ title: 'Design a poster for our event' });

      const res = await api().get('/api/admin/jobs').set(bearer(admin.token));

      assert.equal(res.status, 200);
      const [item] = res.body.data.jobs;
      assert.equal(item.id, job.id);
      assert.equal(item._id, undefined);
      assert.equal(item.title, 'Design a poster for our event');
      assert.equal(item.removedByAdmin, false);
      assert.equal(item.poster.id, poster.user.id);
      assert.equal(item.poster.email, poster.user.email);
      assert.equal(item.category.name, category.name);
      assert.equal(res.body.data.pagination.total, 1);
    });

    it('filters by status, visibility and title search', async () => {
      const admin = await createUser({ role: 'ADMIN' });
      await setupJob({ title: 'React landing page build', status: 'OPEN' });
      await setupJob({ title: 'Photo shoot assistant', status: 'CLOSED' });
      await setupJob({ title: 'Hidden bad listing', removedByAdmin: true });

      const closed = await api().get('/api/admin/jobs?status=CLOSED').set(bearer(admin.token));
      assert.deepEqual(closed.body.data.jobs.map((j) => j.title), ['Photo shoot assistant']);

      const removed = await api().get('/api/admin/jobs?visibility=removed').set(bearer(admin.token));
      assert.deepEqual(removed.body.data.jobs.map((j) => j.title), ['Hidden bad listing']);

      const visible = await api().get('/api/admin/jobs?visibility=visible').set(bearer(admin.token));
      assert.equal(visible.body.data.jobs.length, 2);

      const search = await api().get('/api/admin/jobs?search=REACT').set(bearer(admin.token));
      assert.deepEqual(search.body.data.jobs.map((j) => j.title), ['React landing page build']);
    });

    it('rejects an invalid filter and non-admins', async () => {
      const admin = await createUser({ role: 'ADMIN' });
      const bad = await api().get('/api/admin/jobs?visibility=maybe').set(bearer(admin.token));
      assert.equal(bad.status, 400);

      const poster = await createUser({ role: 'POSTER' });
      const forbidden = await api().get('/api/admin/jobs').set(bearer(poster.token));
      assert.equal(forbidden.status, 403);
      const anonymous = await api().get('/api/admin/jobs');
      assert.equal(anonymous.status, 401);
    });
  });

  describe('POST /api/admin/jobs/:id/remove and /restore', () => {
    it('removes a job from public discovery and details, and restores it', async () => {
      const admin = await createUser({ role: 'ADMIN' });
      const { job } = await setupJob();

      const removed = await api().post(`/api/admin/jobs/${job.id}/remove`).set(bearer(admin.token));
      assert.equal(removed.status, 200);
      assert.equal(removed.body.data.job.removedByAdmin, true);

      const list = await api().get('/api/jobs');
      assert.equal(list.body.data.jobs.length, 0);
      const details = await api().get(`/api/jobs/${job.id}`);
      assert.equal(details.status, 404);

      const restored = await api().post(`/api/admin/jobs/${job.id}/restore`).set(bearer(admin.token));
      assert.equal(restored.status, 200);
      assert.equal(restored.body.data.job.removedByAdmin, false);
      assert.equal((await api().get('/api/jobs')).body.data.jobs.length, 1);
    });

    it('rejects removing twice and restoring a job that is not removed', async () => {
      const admin = await createUser({ role: 'ADMIN' });
      const { job } = await setupJob();

      const notRemoved = await api().post(`/api/admin/jobs/${job.id}/restore`).set(bearer(admin.token));
      assert.equal(notRemoved.status, 409);

      await api().post(`/api/admin/jobs/${job.id}/remove`).set(bearer(admin.token));
      const twice = await api().post(`/api/admin/jobs/${job.id}/remove`).set(bearer(admin.token));
      assert.equal(twice.status, 409);
    });

    it('returns 404 for an unknown job and 403 for non-admins', async () => {
      const admin = await createUser({ role: 'ADMIN' });
      const unknown = await api().post('/api/admin/jobs/507f1f77bcf86cd799439011/remove').set(bearer(admin.token));
      assert.equal(unknown.status, 404);

      const { job, poster } = await setupJob();
      const byOwner = await api().post(`/api/admin/jobs/${job.id}/remove`).set(bearer(poster.token));
      assert.equal(byOwner.status, 403);
      assert.equal((await Job.findById(job._id)).removedByAdmin, false);
    });

    it('does not touch the job\u2019s applications when it is removed', async () => {
      const admin = await createUser({ role: 'ADMIN' });
      const { job, application } = await createHire();

      await api().post(`/api/admin/jobs/${job.id}/remove`).set(bearer(admin.token));

      assert.equal((await Application.findById(application._id)).status, 'ACCEPTED');
      assert.equal((await Job.findById(job._id)).status, 'IN_PROGRESS');
    });

    it('stops students applying to, and anyone reporting, a removed job', async () => {
      const admin = await createUser({ role: 'ADMIN' });
      const { job } = await setupJob();
      const student = await createUser({ role: 'STUDENT' });
      await api().post(`/api/admin/jobs/${job.id}/remove`).set(bearer(admin.token));

      const apply = await api()
        .post(`/api/jobs/${job.id}/applications`)
        .set(bearer(student.token))
        .send({ coverMessage: 'I can start this weekend and have done similar work.' });
      assert.equal(apply.status, 404);

      const report = await api()
        .post('/api/reports')
        .set(bearer(student.token))
        .send({ targetType: 'JOB', targetId: job.id, reason: 'SPAM' });
      assert.equal(report.status, 404);
    });

    it('lets the poster see a removed job in My jobs but not edit it', async () => {
      const admin = await createUser({ role: 'ADMIN' });
      const { job, poster } = await setupJob();
      await api().post(`/api/admin/jobs/${job.id}/remove`).set(bearer(admin.token));

      const mine = await api().get('/api/jobs/mine').set(bearer(poster.token));
      assert.equal(mine.status, 200);
      assert.equal(mine.body.data.jobs[0].removedByAdmin, true);

      const edit = await api()
        .put(`/api/jobs/${job.id}`)
        .set(bearer(poster.token))
        .send({ title: 'A brand new title here' });
      assert.equal(edit.status, 409);
    });
  });
});
