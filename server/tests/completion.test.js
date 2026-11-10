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

describe('Job completion', () => {
  before(setupDatabase);
  beforeEach(clearDatabase);
  after(teardownDatabase);

  describe('POST /api/jobs/:id/complete', () => {
    it('lets the poster complete an in-progress job and completes the accepted application', async () => {
      const { job, application, posterToken } = await createHire();

      const res = await api().post(`/api/jobs/${job.id}/complete`).set(bearer(posterToken));

      assert.equal(res.status, 200);
      assert.equal(res.body.data.job.status, 'COMPLETED');
      assert.equal(res.body.data.job.id, job.id);
      assert.equal(res.body.data.job._id, undefined);

      const savedJob = await Job.findById(job._id);
      const savedApplication = await Application.findById(application._id);
      assert.equal(savedJob.status, 'COMPLETED');
      assert.equal(savedApplication.status, 'COMPLETED');
    });

    it('requires authentication', async () => {
      const { job } = await createHire();
      const res = await api().post(`/api/jobs/${job.id}/complete`);
      assert.equal(res.status, 401);
    });

    it('rejects a student', async () => {
      const { job, studentToken } = await createHire();
      const res = await api().post(`/api/jobs/${job.id}/complete`).set(bearer(studentToken));
      assert.equal(res.status, 403);
    });

    it("returns 404 for another poster's job", async () => {
      const { job } = await createHire();
      const other = await createUser({ role: 'POSTER' });
      const res = await api().post(`/api/jobs/${job.id}/complete`).set(bearer(other.token));
      assert.equal(res.status, 404);
    });

    it('rejects a job that is still open', async () => {
      const category = await createCategory();
      const { user, token } = await createUser({ role: 'POSTER' });
      const job = await createJob({ poster: user._id, category: category._id });

      const res = await api().post(`/api/jobs/${job.id}/complete`).set(bearer(token));
      assert.equal(res.status, 409);
      assert.equal((await Job.findById(job._id)).status, 'OPEN');
    });

    it('rejects completing a job twice', async () => {
      const { job, posterToken } = await createHire();
      await api().post(`/api/jobs/${job.id}/complete`).set(bearer(posterToken));
      const second = await api().post(`/api/jobs/${job.id}/complete`).set(bearer(posterToken));
      assert.equal(second.status, 409);
    });

    it('rejects a cancelled job', async () => {
      const { job, posterToken } = await createHire({ jobStatus: 'CANCELLED', applicationStatus: 'WITHDRAWN' });
      const res = await api().post(`/api/jobs/${job.id}/complete`).set(bearer(posterToken));
      assert.equal(res.status, 409);
    });

    it('returns 400 for a malformed id', async () => {
      const { token } = await createUser({ role: 'POSTER' });
      const res = await api().post('/api/jobs/not-an-id/complete').set(bearer(token));
      assert.equal(res.status, 400);
    });
  });

  describe('after completion', () => {
    it('a completed job can no longer be cancelled', async () => {
      const { job, posterToken } = await createHire();
      await api().post(`/api/jobs/${job.id}/complete`).set(bearer(posterToken));

      const res = await api().post(`/api/jobs/${job.id}/cancel`).set(bearer(posterToken));
      assert.equal(res.status, 409);
      assert.equal((await Job.findById(job._id)).status, 'COMPLETED');
    });

    it('the student can no longer withdraw a completed application', async () => {
      const { job, application, posterToken, studentToken } = await createHire();
      await api().post(`/api/jobs/${job.id}/complete`).set(bearer(posterToken));

      const res = await api().post(`/api/applications/${application.id}/withdraw`).set(bearer(studentToken));
      assert.equal(res.status, 409);
      assert.equal((await Application.findById(application._id)).status, 'COMPLETED');
    });

    it('a completed job does not appear in public discovery', async () => {
      const { job, posterToken } = await createHire();
      await api().post(`/api/jobs/${job.id}/complete`).set(bearer(posterToken));

      const res = await api().get('/api/jobs');
      assert.equal(res.status, 200);
      assert.equal(res.body.data.jobs.length, 0);
    });
  });
});
