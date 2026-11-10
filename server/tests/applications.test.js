const {
  api,
  bearer,
  createUser,
  createCategory,
  createJob,
  createApplication,
  daysFromNow,
  setupDatabase,
  clearDatabase,
  teardownDatabase,
} = require('./helpers/testApp');
const { describe, it, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const Job = require('../src/models/Job');
const Application = require('../src/models/Application');

// Small helper so each test doesn't repeat the same three-call setup.
async function setupOpenJob(jobOverrides = {}) {
  const category = await createCategory();
  const posterAuth = await createUser({ role: 'POSTER' });
  const job = await createJob({ poster: posterAuth.user._id, category: category._id, ...jobOverrides });
  return { job, poster: posterAuth.user, posterToken: posterAuth.token };
}

describe('Applications', () => {
  before(setupDatabase);
  beforeEach(clearDatabase);
  after(teardownDatabase);

  describe('POST /api/jobs/:id/applications (apply)', () => {
    it('lets a student apply to an open job', async () => {
      const { job } = await setupOpenJob();
      const { token } = await createUser({ role: 'STUDENT' });

      const res = await api()
        .post(`/api/jobs/${job.id}/applications`)
        .set(bearer(token))
        .send({ coverMessage: 'I am very interested in this job and available right away.' });

      assert.equal(res.status, 201);
      assert.equal(res.body.data.application.status, 'PENDING');
      assert.equal(res.body.data.application.job.id, job.id);
    });

    it('accepts an optional proposedAmount', async () => {
      const { job } = await setupOpenJob();
      const { token } = await createUser({ role: 'STUDENT' });

      const res = await api()
        .post(`/api/jobs/${job.id}/applications`)
        .set(bearer(token))
        .send({ coverMessage: 'I can start this weekend and have done similar work.', proposedAmount: 1500 });

      assert.equal(res.status, 201);
      assert.equal(res.body.data.application.proposedAmount, 1500);
    });

    it('rejects a poster trying to apply', async () => {
      const { job } = await setupOpenJob();
      const { token } = await createUser({ role: 'POSTER' });

      const res = await api()
        .post(`/api/jobs/${job.id}/applications`)
        .set(bearer(token))
        .send({ coverMessage: 'I would like to help with this job as well.' });

      assert.equal(res.status, 403);
    });

    it('requires authentication', async () => {
      const { job } = await setupOpenJob();
      const res = await api()
        .post(`/api/jobs/${job.id}/applications`)
        .send({ coverMessage: 'I would like to help with this job as well.' });
      assert.equal(res.status, 401);
    });

    it('rejects a cover message that is too short', async () => {
      const { job } = await setupOpenJob();
      const { token } = await createUser({ role: 'STUDENT' });

      const res = await api().post(`/api/jobs/${job.id}/applications`).set(bearer(token)).send({ coverMessage: 'Hi' });
      assert.equal(res.status, 400);
      assert.ok(res.body.errors.some((e) => e.field === 'coverMessage'));
    });

    it('rejects applying to a job that is not open', async () => {
      const { job } = await setupOpenJob({ status: 'CLOSED' });
      const { token } = await createUser({ role: 'STUDENT' });

      const res = await api()
        .post(`/api/jobs/${job.id}/applications`)
        .set(bearer(token))
        .send({ coverMessage: 'I would like to help with this job as well.' });

      assert.equal(res.status, 409);
    });

    it('rejects applying after the deadline has passed', async () => {
      const { job } = await setupOpenJob({ deadline: daysFromNow(-1) });
      const { token } = await createUser({ role: 'STUDENT' });

      const res = await api()
        .post(`/api/jobs/${job.id}/applications`)
        .set(bearer(token))
        .send({ coverMessage: 'I would like to help with this job as well.' });

      assert.equal(res.status, 409);
    });

    it('rejects a second application to the same job by the same student', async () => {
      const { job } = await setupOpenJob();
      const { token } = await createUser({ role: 'STUDENT' });
      const body = { coverMessage: 'I would like to help with this job as well.' };

      const first = await api().post(`/api/jobs/${job.id}/applications`).set(bearer(token)).send(body);
      const second = await api().post(`/api/jobs/${job.id}/applications`).set(bearer(token)).send(body);

      assert.equal(first.status, 201);
      assert.equal(second.status, 409);
      assert.equal(await Application.countDocuments({ job: job._id }), 1);
    });

    it('never allows re-applying after withdrawing (one application per student per job, ever)', async () => {
      const { job } = await setupOpenJob();
      const { user, token } = await createUser({ role: 'STUDENT' });
      const application = await createApplication({ job: job._id, student: user._id, status: 'WITHDRAWN', withdrawnBy: 'STUDENT' });

      const res = await api()
        .post(`/api/jobs/${job.id}/applications`)
        .set(bearer(token))
        .send({ coverMessage: 'I would like to try applying again, please.' });

      assert.equal(res.status, 409);
      assert.equal(await Application.countDocuments({ job: job._id, student: user._id }), 1);
      assert.equal((await Application.findById(application._id)).status, 'WITHDRAWN');
    });

    it('returns 404 for a job that does not exist', async () => {
      const { token } = await createUser({ role: 'STUDENT' });
      const res = await api()
        .post('/api/jobs/64b7f0c2a1b2c3d4e5f60718/applications')
        .set(bearer(token))
        .send({ coverMessage: 'I would like to help with this job as well.' });
      assert.equal(res.status, 404);
    });
  });

  describe('GET /api/jobs/:id/applications (poster views applicants)', () => {
    it('lets the owning poster see applicants', async () => {
      const { job, posterToken } = await setupOpenJob();
      const applicant = await createUser({ role: 'STUDENT' });
      await createApplication({ job: job._id, student: applicant.user._id });

      const res = await api().get(`/api/jobs/${job.id}/applications`).set(bearer(posterToken));

      assert.equal(res.status, 200);
      assert.equal(res.body.data.applications.length, 1);
      assert.equal(res.body.data.applications[0].student.name, applicant.user.name);
    });

    it('hides a PENDING application from a suspended student, but not a REJECTED one', async () => {
      const { job, posterToken } = await setupOpenJob();
      const suspended = await createUser({ role: 'STUDENT', status: 'SUSPENDED' });
      await createApplication({ job: job._id, student: suspended.user._id, status: 'PENDING' });
      const other = await createUser({ role: 'STUDENT', status: 'SUSPENDED' });
      await createApplication({ job: job._id, student: other.user._id, status: 'REJECTED' });

      const res = await api().get(`/api/jobs/${job.id}/applications`).set(bearer(posterToken));

      assert.equal(res.body.data.applications.length, 1);
      assert.equal(res.body.data.applications[0].status, 'REJECTED');
    });

    it('rejects a different poster (404, not revealing the job exists for them)', async () => {
      const { job } = await setupOpenJob();
      const other = await createUser({ role: 'POSTER' });
      const res = await api().get(`/api/jobs/${job.id}/applications`).set(bearer(other.token));
      assert.equal(res.status, 404);
    });

    it('rejects a student', async () => {
      const { job } = await setupOpenJob();
      const { token } = await createUser({ role: 'STUDENT' });
      const res = await api().get(`/api/jobs/${job.id}/applications`).set(bearer(token));
      assert.equal(res.status, 403);
    });
  });

  describe('GET /api/applications/mine', () => {
    it('lists only the logged-in student’s own applications', async () => {
      const { job } = await setupOpenJob();
      const mine = await createUser({ role: 'STUDENT' });
      const someoneElse = await createUser({ role: 'STUDENT' });
      await createApplication({ job: job._id, student: mine.user._id });
      await createApplication({ job: job._id, student: someoneElse.user._id });

      const res = await api().get('/api/applications/mine').set(bearer(mine.token));

      assert.equal(res.status, 200);
      assert.equal(res.body.data.applications.length, 1);
      assert.equal(res.body.data.applications[0].job.id, job.id);
    });

    it('rejects a poster', async () => {
      const { token } = await createUser({ role: 'POSTER' });
      const res = await api().get('/api/applications/mine').set(bearer(token));
      assert.equal(res.status, 403);
    });
  });

  describe('POST /api/applications/:id/shortlist', () => {
    it('lets the owning poster shortlist a pending application', async () => {
      const { job, posterToken } = await setupOpenJob();
      const application = await createApplication({ job: job._id });

      const res = await api().post(`/api/applications/${application.id}/shortlist`).set(bearer(posterToken));

      assert.equal(res.status, 200);
      assert.equal(res.body.data.application.status, 'SHORTLISTED');
    });

    it('rejects shortlisting a non-pending application', async () => {
      const { job, posterToken } = await setupOpenJob();
      const application = await createApplication({ job: job._id, status: 'REJECTED' });

      const res = await api().post(`/api/applications/${application.id}/shortlist`).set(bearer(posterToken));
      assert.equal(res.status, 409);
    });

    it('rejects a different poster', async () => {
      const { job } = await setupOpenJob();
      const application = await createApplication({ job: job._id });
      const other = await createUser({ role: 'POSTER' });

      const res = await api().post(`/api/applications/${application.id}/shortlist`).set(bearer(other.token));
      assert.equal(res.status, 404);
    });
  });

  describe('POST /api/applications/:id/reject', () => {
    it('rejects a pending or shortlisted application', async () => {
      const { job, posterToken } = await setupOpenJob();
      const pending = await createApplication({ job: job._id, status: 'PENDING' });
      const shortlisted = await createApplication({ job: job._id, status: 'SHORTLISTED' });

      const r1 = await api().post(`/api/applications/${pending.id}/reject`).set(bearer(posterToken));
      const r2 = await api().post(`/api/applications/${shortlisted.id}/reject`).set(bearer(posterToken));

      assert.equal(r1.body.data.application.status, 'REJECTED');
      assert.equal(r2.body.data.application.status, 'REJECTED');
    });

    it('rejects rejecting an already-final application', async () => {
      const { job, posterToken } = await setupOpenJob();
      const application = await createApplication({ job: job._id, status: 'WITHDRAWN', withdrawnBy: 'STUDENT' });

      const res = await api().post(`/api/applications/${application.id}/reject`).set(bearer(posterToken));
      assert.equal(res.status, 409);
    });
  });

  describe('POST /api/applications/:id/accept (the core atomic rule)', () => {
    it('accepts one application, rejects every other open one, and starts the job', async () => {
      const { job, posterToken } = await setupOpenJob();
      const winner = await createApplication({ job: job._id, status: 'PENDING' });
      const loser1 = await createApplication({ job: job._id, status: 'PENDING' });
      const loser2 = await createApplication({ job: job._id, status: 'SHORTLISTED' });
      const alreadyRejected = await createApplication({ job: job._id, status: 'REJECTED' });

      const res = await api().post(`/api/applications/${winner.id}/accept`).set(bearer(posterToken));

      assert.equal(res.status, 200);
      assert.equal(res.body.data.application.status, 'ACCEPTED');

      const updatedJob = await Job.findById(job._id);
      assert.equal(updatedJob.status, 'IN_PROGRESS');
      assert.equal(String(updatedJob.acceptedApplication), String(winner._id));

      assert.equal((await Application.findById(loser1._id)).status, 'REJECTED');
      assert.equal((await Application.findById(loser2._id)).status, 'REJECTED');
      // Was already rejected beforehand - must stay REJECTED, not be touched or re-flagged.
      assert.equal((await Application.findById(alreadyRejected._id)).status, 'REJECTED');
    });

    it('cannot accept an application once the job is no longer open (race/second-accept guard)', async () => {
      const { job, posterToken } = await setupOpenJob();
      const first = await createApplication({ job: job._id, status: 'PENDING' });
      const second = await createApplication({ job: job._id, status: 'PENDING' });

      const firstAccept = await api().post(`/api/applications/${first.id}/accept`).set(bearer(posterToken));
      const secondAccept = await api().post(`/api/applications/${second.id}/accept`).set(bearer(posterToken));

      assert.equal(firstAccept.status, 200);
      assert.equal(secondAccept.status, 409);
      // The second application was auto-rejected by the first accept, so it is no longer
      // PENDING/SHORTLISTED either - double guard confirmed at both the job and application level.
      assert.equal((await Application.findById(second._id)).status, 'REJECTED');
    });

    it('rejects accepting a withdrawn or already-rejected application', async () => {
      const { job, posterToken } = await setupOpenJob();
      const withdrawn = await createApplication({ job: job._id, status: 'WITHDRAWN', withdrawnBy: 'STUDENT' });

      const res = await api().post(`/api/applications/${withdrawn.id}/accept`).set(bearer(posterToken));
      assert.equal(res.status, 409);
    });

    it('rejects a different poster accepting', async () => {
      const { job } = await setupOpenJob();
      const application = await createApplication({ job: job._id });
      const other = await createUser({ role: 'POSTER' });

      const res = await api().post(`/api/applications/${application.id}/accept`).set(bearer(other.token));
      assert.equal(res.status, 404);
    });

    it('rejects a student calling accept', async () => {
      const { job } = await setupOpenJob();
      const application = await createApplication({ job: job._id });
      const { token } = await createUser({ role: 'STUDENT' });

      const res = await api().post(`/api/applications/${application.id}/accept`).set(bearer(token));
      assert.equal(res.status, 403);
    });
  });

  describe('POST /api/applications/:id/withdraw', () => {
    it('lets the applicant withdraw a pending application', async () => {
      const { job } = await setupOpenJob();
      const { user, token } = await createUser({ role: 'STUDENT' });
      const application = await createApplication({ job: job._id, student: user._id, status: 'PENDING' });

      const res = await api().post(`/api/applications/${application.id}/withdraw`).set(bearer(token));

      assert.equal(res.status, 200);
      assert.equal(res.body.data.application.status, 'WITHDRAWN');
      assert.equal(res.body.data.application.withdrawnBy, 'STUDENT');
    });

    it('reopens the job to OPEN when the accepted student withdraws before completion', async () => {
      const { job, posterToken } = await setupOpenJob();
      const { user, token } = await createUser({ role: 'STUDENT' });
      const application = await createApplication({ job: job._id, student: user._id, status: 'PENDING' });
      await api().post(`/api/applications/${application.id}/accept`).set(bearer(posterToken));

      const res = await api().post(`/api/applications/${application.id}/withdraw`).set(bearer(token));

      assert.equal(res.status, 200);
      assert.equal(res.body.data.application.status, 'WITHDRAWN');

      const updatedJob = await Job.findById(job._id);
      assert.equal(updatedJob.status, 'OPEN');
      assert.equal(updatedJob.acceptedApplication, null);
    });

    it('does not resurrect other already-rejected applicants when the job reopens', async () => {
      const { job, posterToken } = await setupOpenJob();
      const { user, token } = await createUser({ role: 'STUDENT' });
      const winner = await createApplication({ job: job._id, student: user._id, status: 'PENDING' });
      const loser = await createApplication({ job: job._id, status: 'PENDING' });
      await api().post(`/api/applications/${winner.id}/accept`).set(bearer(posterToken));

      await api().post(`/api/applications/${winner.id}/withdraw`).set(bearer(token));

      // Per Section 33: "other applications stay REJECTED (Poster may re-post if needed)."
      assert.equal((await Application.findById(loser._id)).status, 'REJECTED');
    });

    it('rejects withdrawing someone else’s application', async () => {
      const { job } = await setupOpenJob();
      const owner = await createUser({ role: 'STUDENT' });
      const attacker = await createUser({ role: 'STUDENT' });
      const application = await createApplication({ job: job._id, student: owner.user._id });

      const res = await api().post(`/api/applications/${application.id}/withdraw`).set(bearer(attacker.token));
      assert.equal(res.status, 404);
    });

    it('rejects withdrawing an already-final application', async () => {
      const { job } = await setupOpenJob();
      const { user, token } = await createUser({ role: 'STUDENT' });
      const application = await createApplication({ job: job._id, student: user._id, status: 'REJECTED' });

      const res = await api().post(`/api/applications/${application.id}/withdraw`).set(bearer(token));
      assert.equal(res.status, 409);
    });
  });

  describe('Job cancellation interacting with an accepted application', () => {
    it('withdraws the accepted application with reason POSTER_CANCELLED when the poster cancels an in-progress job', async () => {
      const { job, posterToken } = await setupOpenJob();
      const applicant = await createUser({ role: 'STUDENT' });
      const application = await createApplication({ job: job._id, student: applicant.user._id, status: 'PENDING' });
      await api().post(`/api/applications/${application.id}/accept`).set(bearer(posterToken));

      const res = await api().post(`/api/jobs/${job.id}/cancel`).set(bearer(posterToken));

      assert.equal(res.status, 200);
      assert.equal(res.body.data.job.status, 'CANCELLED');

      const updatedApplication = await Application.findById(application._id);
      assert.equal(updatedApplication.status, 'WITHDRAWN');
      assert.equal(updatedApplication.withdrawnBy, 'POSTER_CANCELLED');
    });
  });

  describe('Job deletion once it has applications', () => {
    it('refuses to delete an open job that already has an application', async () => {
      const { job, posterToken } = await setupOpenJob();
      await createApplication({ job: job._id });

      const res = await api().delete(`/api/jobs/${job.id}`).set(bearer(posterToken));

      assert.equal(res.status, 409);
      assert.notEqual(await Job.findById(job._id), null);
    });

    it('still allows deleting an open job with zero applications', async () => {
      const { job, posterToken } = await setupOpenJob();
      const res = await api().delete(`/api/jobs/${job.id}`).set(bearer(posterToken));
      assert.equal(res.status, 200);
    });
  });
});
