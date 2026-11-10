const {
  api,
  bearer,
  createUser,
  createHire,
  createApplication,
  setupDatabase,
  clearDatabase,
  teardownDatabase,
} = require('./helpers/testApp');
const { describe, it, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const Review = require('../src/models/Review');
const User = require('../src/models/User');
const reviewService = require('../src/services/reviewService');

const reviewUrl = (jobId) => `/api/jobs/${jobId}/reviews`;

// A finished job: IN_PROGRESS is the state right after accept, COMPLETED is what reviews need.
const completedHire = (options = {}) =>
  createHire({ jobStatus: 'COMPLETED', applicationStatus: 'COMPLETED', ...options });

describe('Reviews', () => {
  before(setupDatabase);
  beforeEach(clearDatabase);
  after(teardownDatabase);

  describe('POST /api/jobs/:id/reviews', () => {
    it('lets the poster review the accepted student', async () => {
      const { job, student, posterToken } = await completedHire();

      const res = await api()
        .post(reviewUrl(job.id))
        .set(bearer(posterToken))
        .send({ rating: 5, comment: 'Delivered everything on time.' });

      assert.equal(res.status, 201);
      assert.equal(res.body.data.review.rating, 5);
      assert.equal(res.body.data.review.comment, 'Delivered everything on time.');
      assert.equal(res.body.data.review.reviewee.id, student.id);
    });

    it('lets the accepted student review the poster', async () => {
      const { job, poster, studentToken } = await completedHire();

      const res = await api().post(reviewUrl(job.id)).set(bearer(studentToken)).send({ rating: 4 });

      assert.equal(res.status, 201);
      assert.equal(res.body.data.review.reviewee.id, poster.id);
      assert.equal(res.body.data.review.comment, '');
    });

    it('returns id (not _id) and never leaks email or account status', async () => {
      // Regression guard for BF1: every model must serialise with `id`.
      const { job, posterToken } = await completedHire();

      const res = await api().post(reviewUrl(job.id)).set(bearer(posterToken)).send({ rating: 3 });
      const { review } = res.body.data;

      assert.ok(review.id);
      assert.equal(review._id, undefined);
      assert.ok(review.reviewer.id);
      assert.equal(review.reviewer.email, undefined);
      assert.equal(review.reviewee.email, undefined);
      assert.equal(review.reviewer.status, undefined);
      assert.equal(review.reviewer.profileCompletion, undefined);
    });

    it("updates the reviewee's rating summary", async () => {
      const { job, student, posterToken } = await completedHire();
      await api().post(reviewUrl(job.id)).set(bearer(posterToken)).send({ rating: 4 });

      const saved = await User.findById(student._id);
      assert.equal(saved.ratingSummary.average, 4);
      assert.equal(saved.ratingSummary.count, 1);
    });

    it('averages several reviews and rounds to one decimal', async () => {
      const student = await createUser({ role: 'STUDENT' });
      for (const rating of [5, 4, 4]) {
        const { job, posterToken } = await completedHire({ student });
        const res = await api().post(reviewUrl(job.id)).set(bearer(posterToken)).send({ rating });
        assert.equal(res.status, 201);
      }

      const saved = await User.findById(student.user._id);
      assert.equal(saved.ratingSummary.count, 3);
      assert.equal(saved.ratingSummary.average, 4.3); // (5 + 4 + 4) / 3 = 4.33...
    });

    it('allows one review in each direction on the same job', async () => {
      const { job, posterToken, studentToken } = await completedHire();

      const fromPoster = await api().post(reviewUrl(job.id)).set(bearer(posterToken)).send({ rating: 5 });
      const fromStudent = await api().post(reviewUrl(job.id)).set(bearer(studentToken)).send({ rating: 3 });

      assert.equal(fromPoster.status, 201);
      assert.equal(fromStudent.status, 201);
      assert.equal(await Review.countDocuments({ job: job._id }), 2);
    });

    it('rejects a second review from the same person for the same job', async () => {
      const { job, posterToken } = await completedHire();
      await api().post(reviewUrl(job.id)).set(bearer(posterToken)).send({ rating: 5 });

      const res = await api().post(reviewUrl(job.id)).set(bearer(posterToken)).send({ rating: 1 });
      assert.equal(res.status, 409);
      assert.equal(await Review.countDocuments({ job: job._id }), 1);
    });

    it('rejects a review for a job that is not completed yet', async () => {
      const { job, posterToken } = await createHire(); // IN_PROGRESS
      const res = await api().post(reviewUrl(job.id)).set(bearer(posterToken)).send({ rating: 5 });
      assert.equal(res.status, 409);
    });

    it('rejects a review for a cancelled job', async () => {
      const { job, posterToken } = await createHire({ jobStatus: 'CANCELLED', applicationStatus: 'WITHDRAWN' });
      const res = await api().post(reviewUrl(job.id)).set(bearer(posterToken)).send({ rating: 5 });
      assert.equal(res.status, 409);
    });

    it('returns 404 for a poster who does not own the job', async () => {
      const { job } = await completedHire();
      const stranger = await createUser({ role: 'POSTER' });
      const res = await api().post(reviewUrl(job.id)).set(bearer(stranger.token)).send({ rating: 5 });
      assert.equal(res.status, 404);
    });

    it('returns 404 for a student who was not the accepted one', async () => {
      const { job } = await completedHire();
      const loser = await createUser({ role: 'STUDENT' });
      await createApplication({ job: job._id, student: loser.user._id, status: 'REJECTED' });

      const res = await api().post(reviewUrl(job.id)).set(bearer(loser.token)).send({ rating: 1 });
      assert.equal(res.status, 404);
    });

    it('requires authentication and rejects admins', async () => {
      const { job } = await completedHire();
      const anonymous = await api().post(reviewUrl(job.id)).send({ rating: 5 });
      assert.equal(anonymous.status, 401);

      const admin = await createUser({ role: 'ADMIN' });
      const asAdmin = await api().post(reviewUrl(job.id)).set(bearer(admin.token)).send({ rating: 5 });
      assert.equal(asAdmin.status, 403);
    });

    it('rejects ratings that are missing, out of range, fractional, or not numbers', async () => {
      const { job, posterToken } = await completedHire();

      for (const body of [{}, { rating: 0 }, { rating: 6 }, { rating: 3.5 }, { rating: '5' }]) {
        const res = await api().post(reviewUrl(job.id)).set(bearer(posterToken)).send(body);
        assert.equal(res.status, 400, `expected 400 for ${JSON.stringify(body)}`);
        assert.ok(res.body.errors.some((e) => e.field === 'rating'));
      }
      assert.equal(await Review.countDocuments({}), 0);
    });

    it('rejects a comment that is too long', async () => {
      const { job, posterToken } = await completedHire();
      const res = await api()
        .post(reviewUrl(job.id))
        .set(bearer(posterToken))
        .send({ rating: 4, comment: 'x'.repeat(1001) });
      assert.equal(res.status, 400);
      assert.ok(res.body.errors.some((e) => e.field === 'comment'));
    });

    it('ignores a reviewee sent in the body', async () => {
      const { job, student, posterToken } = await completedHire();
      const someoneElse = await createUser({ role: 'STUDENT' });

      const res = await api()
        .post(reviewUrl(job.id))
        .set(bearer(posterToken))
        .send({ rating: 5, reviewee: someoneElse.user.id, reviewer: someoneElse.user.id });

      assert.equal(res.status, 201);
      assert.equal(res.body.data.review.reviewee.id, student.id);
      assert.notEqual(res.body.data.review.reviewer.id, someoneElse.user.id);
    });
  });

  describe('GET /api/jobs/:id/reviews', () => {
    it('shows who can be reviewed and flips canReview once a review is given', async () => {
      const { job, student, posterToken, studentToken } = await completedHire();

      const before = await api().get(reviewUrl(job.id)).set(bearer(posterToken));
      assert.equal(before.status, 200);
      assert.equal(before.body.data.canReview, true);
      assert.equal(before.body.data.given, null);
      assert.equal(before.body.data.counterpart.id, student.id);
      assert.equal(before.body.data.counterpart.email, undefined);

      await api().post(reviewUrl(job.id)).set(bearer(posterToken)).send({ rating: 5, comment: 'Great.' });
      await api().post(reviewUrl(job.id)).set(bearer(studentToken)).send({ rating: 4, comment: 'Fair.' });

      const after = await api().get(reviewUrl(job.id)).set(bearer(posterToken));
      assert.equal(after.body.data.canReview, false);
      assert.equal(after.body.data.given.rating, 5);
      assert.equal(after.body.data.received.rating, 4);
      assert.equal(after.body.data.received.comment, 'Fair.');
    });

    it('reports nothing to review while the job is not completed', async () => {
      const { job, posterToken } = await createHire();
      const res = await api().get(reviewUrl(job.id)).set(bearer(posterToken));
      assert.equal(res.status, 200);
      assert.equal(res.body.data.canReview, false);
      assert.equal(res.body.data.counterpart, null);
    });

    it('returns 404 for someone who is not a participant', async () => {
      const { job } = await completedHire();
      const stranger = await createUser({ role: 'STUDENT' });
      const res = await api().get(reviewUrl(job.id)).set(bearer(stranger.token));
      assert.equal(res.status, 404);
    });

    it('does not let a removed review be replaced by a new one', async () => {
      const { job, posterToken } = await completedHire();
      await api().post(reviewUrl(job.id)).set(bearer(posterToken)).send({ rating: 1 });
      await Review.updateMany({ job: job._id }, { removedByAdmin: true });

      const res = await api().get(reviewUrl(job.id)).set(bearer(posterToken));
      assert.equal(res.body.data.canReview, false);

      const again = await api().post(reviewUrl(job.id)).set(bearer(posterToken)).send({ rating: 5 });
      assert.equal(again.status, 409);
    });
  });

  describe('GET /api/reviews/user/:id', () => {
    it('lists the reviews a user has received, newest first, with reviewer and job', async () => {
      const student = await createUser({ role: 'STUDENT' });
      const viewer = await createUser({ role: 'POSTER' });
      const first = await completedHire({ student });
      await api().post(reviewUrl(first.job.id)).set(bearer(first.posterToken)).send({ rating: 3, comment: 'Okay.' });
      const second = await completedHire({ student });
      await api().post(reviewUrl(second.job.id)).set(bearer(second.posterToken)).send({ rating: 5, comment: 'Great.' });

      const res = await api().get(`/api/reviews/user/${student.user.id}`).set(bearer(viewer.token));

      assert.equal(res.status, 200);
      assert.equal(res.body.data.reviews.length, 2);
      assert.equal(res.body.data.reviews[0].comment, 'Great.');
      assert.ok(res.body.data.reviews[0].id);
      assert.equal(res.body.data.reviews[0].job.title, second.job.title);
      assert.ok(res.body.data.reviews[0].reviewer.name);
      assert.equal(res.body.data.reviews[0].reviewer.email, undefined);
    });

    it('leaves out reviews removed by an admin', async () => {
      const student = await createUser({ role: 'STUDENT' });
      const hire = await completedHire({ student });
      await api().post(reviewUrl(hire.job.id)).set(bearer(hire.posterToken)).send({ rating: 1 });
      await Review.updateMany({}, { removedByAdmin: true });

      const res = await api().get(`/api/reviews/user/${student.user.id}`).set(bearer(hire.posterToken));
      assert.equal(res.status, 200);
      assert.equal(res.body.data.reviews.length, 0);
    });

    it('returns 404 for a suspended user, an admin, and an unknown id', async () => {
      const viewer = await createUser({ role: 'STUDENT' });
      const suspended = await createUser({ role: 'STUDENT', status: 'SUSPENDED' });
      const admin = await createUser({ role: 'ADMIN' });

      for (const id of [suspended.user.id, admin.user.id, '507f1f77bcf86cd799439011']) {
        const res = await api().get(`/api/reviews/user/${id}`).set(bearer(viewer.token));
        assert.equal(res.status, 404, `expected 404 for ${id}`);
      }
    });

    it('requires authentication and a valid id', async () => {
      const viewer = await createUser({ role: 'STUDENT' });
      const anonymous = await api().get(`/api/reviews/user/${viewer.user.id}`);
      assert.equal(anonymous.status, 401);

      const badId = await api().get('/api/reviews/user/nope').set(bearer(viewer.token));
      assert.equal(badId.status, 400);
    });
  });

  describe('recalculateRatingSummary', () => {
    it('ignores reviews removed by an admin and resets to zero when none are left', async () => {
      const student = await createUser({ role: 'STUDENT' });
      for (const rating of [5, 3]) {
        const { job, posterToken } = await completedHire({ student });
        await api().post(reviewUrl(job.id)).set(bearer(posterToken)).send({ rating });
      }
      assert.equal((await User.findById(student.user._id)).ratingSummary.average, 4);

      const [firstReview] = await Review.find({ reviewee: student.user._id }).sort({ createdAt: 1 });
      await Review.updateOne({ _id: firstReview._id }, { removedByAdmin: true });
      const afterOne = await reviewService.recalculateRatingSummary(student.user._id);
      assert.deepEqual(afterOne, { average: 3, count: 1 });

      await Review.updateMany({}, { removedByAdmin: true });
      const afterAll = await reviewService.recalculateRatingSummary(student.user._id);
      assert.deepEqual(afterAll, { average: 0, count: 0 });
    });
  });
});
