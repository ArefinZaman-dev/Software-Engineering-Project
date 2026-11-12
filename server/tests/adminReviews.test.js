const {
  api,
  bearer,
  createUser,
  createHire,
  setupDatabase,
  clearDatabase,
  teardownDatabase,
} = require('./helpers/testApp');
const { describe, it, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const Review = require('../src/models/Review');
const User = require('../src/models/User');

const completedHire = (options = {}) =>
  createHire({ jobStatus: 'COMPLETED', applicationStatus: 'COMPLETED', ...options });

async function summaryOf(user) {
  const saved = await User.findById(user.user._id);
  return { average: saved.ratingSummary.average, count: saved.ratingSummary.count };
}

// A completed job on which the poster has reviewed the student.
async function reviewedHire(student, rating, comment = '') {
  const hire = await completedHire({ student });
  const res = await api()
    .post(`/api/jobs/${hire.job.id}/reviews`)
    .set(bearer(hire.posterToken))
    .send({ rating, comment });
  assert.equal(res.status, 201);
  return { ...hire, reviewId: res.body.data.review.id };
}

describe('Admin: reviews', () => {
  before(setupDatabase);
  beforeEach(clearDatabase);
  after(teardownDatabase);

  describe('GET /api/admin/reviews', () => {
    it('lists reviews with reviewer, reviewee and job', async () => {
      const admin = await createUser({ role: 'ADMIN' });
      const student = await createUser({ role: 'STUDENT' });
      const { job, poster } = await reviewedHire(student, 4, 'Solid work.');

      const res = await api().get('/api/admin/reviews').set(bearer(admin.token));

      assert.equal(res.status, 200);
      const [review] = res.body.data.reviews;
      assert.ok(review.id);
      assert.equal(review._id, undefined);
      assert.equal(review.rating, 4);
      assert.equal(review.comment, 'Solid work.');
      assert.equal(review.reviewer.id, poster.id);
      assert.equal(review.reviewee.id, student.user.id);
      assert.equal(review.job.title, job.title);
      assert.equal(review.removedByAdmin, false);
    });

    it('filters by visibility', async () => {
      const admin = await createUser({ role: 'ADMIN' });
      const student = await createUser({ role: 'STUDENT' });
      await reviewedHire(student, 5);
      await reviewedHire(student, 1);
      const [first] = await Review.find({}).sort({ createdAt: 1 });
      await Review.updateOne({ _id: first._id }, { removedByAdmin: true });

      const removed = await api().get('/api/admin/reviews?visibility=removed').set(bearer(admin.token));
      assert.equal(removed.body.data.reviews.length, 1);
      const visible = await api().get('/api/admin/reviews?visibility=visible').set(bearer(admin.token));
      assert.equal(visible.body.data.reviews.length, 1);
      const all = await api().get('/api/admin/reviews').set(bearer(admin.token));
      assert.equal(all.body.data.reviews.length, 2);
    });

    it('requires an admin', async () => {
      const anonymous = await api().get('/api/admin/reviews');
      assert.equal(anonymous.status, 401);
      const { token } = await createUser({ role: 'STUDENT' });
      const res = await api().get('/api/admin/reviews').set(bearer(token));
      assert.equal(res.status, 403);
    });
  });

  describe('POST /api/admin/reviews/:id/remove and /restore', () => {
    it('removing a review recalculates the rating, hides it from the profile, and restoring brings it back', async () => {
      const admin = await createUser({ role: 'ADMIN' });
      const student = await createUser({ role: 'STUDENT' });
      const fiveStar = await reviewedHire(student, 5, 'Excellent.');
      await reviewedHire(student, 3, 'Okay.');
      assert.deepEqual(await summaryOf(student), { average: 4, count: 2 });

      const removed = await api().post(`/api/admin/reviews/${fiveStar.reviewId}/remove`).set(bearer(admin.token));
      assert.equal(removed.status, 200);
      assert.equal(removed.body.data.review.removedByAdmin, true);
      assert.deepEqual(await summaryOf(student), { average: 3, count: 1 });

      const profileReviews = await api().get(`/api/reviews/user/${student.user.id}`).set(bearer(admin.token));
      assert.deepEqual(profileReviews.body.data.reviews.map((r) => r.comment), ['Okay.']);

      const restored = await api().post(`/api/admin/reviews/${fiveStar.reviewId}/restore`).set(bearer(admin.token));
      assert.equal(restored.status, 200);
      assert.equal(restored.body.data.review.removedByAdmin, false);
      assert.deepEqual(await summaryOf(student), { average: 4, count: 2 });
    });

    it('resets the rating to zero when the only review is removed', async () => {
      const admin = await createUser({ role: 'ADMIN' });
      const student = await createUser({ role: 'STUDENT' });
      const { reviewId } = await reviewedHire(student, 2);

      await api().post(`/api/admin/reviews/${reviewId}/remove`).set(bearer(admin.token));
      assert.deepEqual(await summaryOf(student), { average: 0, count: 0 });
    });

    it('rejects removing twice and restoring a review that is not removed', async () => {
      const admin = await createUser({ role: 'ADMIN' });
      const student = await createUser({ role: 'STUDENT' });
      const { reviewId } = await reviewedHire(student, 4);

      const notRemoved = await api().post(`/api/admin/reviews/${reviewId}/restore`).set(bearer(admin.token));
      assert.equal(notRemoved.status, 409);
      await api().post(`/api/admin/reviews/${reviewId}/remove`).set(bearer(admin.token));
      const twice = await api().post(`/api/admin/reviews/${reviewId}/remove`).set(bearer(admin.token));
      assert.equal(twice.status, 409);
    });

    it('returns 404 for an unknown review and 403 for non-admins', async () => {
      const admin = await createUser({ role: 'ADMIN' });
      const unknown = await api().post('/api/admin/reviews/507f1f77bcf86cd799439011/remove').set(bearer(admin.token));
      assert.equal(unknown.status, 404);

      const student = await createUser({ role: 'STUDENT' });
      const { reviewId, posterToken } = await reviewedHire(student, 4);
      const byAuthor = await api().post(`/api/admin/reviews/${reviewId}/remove`).set(bearer(posterToken));
      assert.equal(byAuthor.status, 403);
      assert.equal((await Review.findById(reviewId)).removedByAdmin, false);
    });
  });
});
