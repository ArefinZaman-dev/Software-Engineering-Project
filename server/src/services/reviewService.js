const mongoose = require('mongoose');
const Review = require('../models/Review');
const Job = require('../models/Job');
const Application = require('../models/Application');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const { JOB_STATUS, ROLES, USER_STATUS } = require('../constants');

const REVIEWER_FIELDS = 'name role';
const USER_REVIEW_LIMIT = 50;

// Works out whether `user` took part in the job, and in which role. A job has exactly two
// participants: its poster, and the student whose application was accepted. Anyone else gets
// a 404, the same choice made for jobs and applications (DECISIONS D24, D30).
async function getParticipation(user, jobId) {
  const job = await Job.findById(jobId);
  if (!job) throw new AppError('Job not found.', 404);

  const application = job.acceptedApplication ? await Application.findById(job.acceptedApplication) : null;
  const isPoster = String(job.poster) === String(user._id);
  const isStudent = Boolean(application) && String(application.student) === String(user._id);
  if (!isPoster && !isStudent) throw new AppError('Job not found.', 404);

  return { job, application, isPoster };
}

// The rating summary on a user is DERIVED data (DECISIONS D17): it is recalculated from the
// reviews collection every time a review is added, and can be recalculated again at any time.
// Reviews an admin removed are excluded (DECISIONS B5), which Increment 6 relies on.
async function recalculateRatingSummary(userId) {
  const [result] = await Review.aggregate([
    { $match: { reviewee: new mongoose.Types.ObjectId(String(userId)), removedByAdmin: false } },
    { $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);

  const summary = result
    ? { average: Math.round(result.average * 10) / 10, count: result.count }
    : { average: 0, count: 0 };

  await User.updateOne({ _id: userId }, { ratingSummary: summary });
  return summary;
}

async function createReview(user, jobId, input) {
  const { job, application, isPoster } = await getParticipation(user, jobId);

  if (job.status !== JOB_STATUS.COMPLETED) {
    throw new AppError('Reviews can only be written after a job is completed.', 409);
  }

  const alreadyReviewed = await Review.exists({ job: job._id, reviewer: user._id });
  if (alreadyReviewed) throw new AppError('You have already reviewed this job.', 409);

  // The reviewee is never taken from the request: the poster reviews the accepted student, and
  // the student reviews the poster.
  const revieweeId = isPoster ? application.student : job.poster;

  let review;
  try {
    review = await Review.create({
      job: job._id,
      application: application._id,
      reviewer: user._id,
      reviewee: revieweeId,
      rating: input.rating,
      comment: input.comment,
    });
  } catch (error) {
    // Race guard: two identical requests at the same instant are stopped by the unique index.
    if (error.code === 11000) throw new AppError('You have already reviewed this job.', 409);
    throw error;
  }

  await recalculateRatingSummary(revieweeId);
  return review.populate([
    { path: 'reviewer', select: REVIEWER_FIELDS },
    { path: 'reviewee', select: REVIEWER_FIELDS },
  ]);
}

// What a participant needs to show the review screen: the other person, the review they have
// given, the review they have received, and whether they may still write one.
async function getJobReviews(user, jobId) {
  const { job, application, isPoster } = await getParticipation(user, jobId);
  const jobSummary = { id: job.id, title: job.title, status: job.status };

  if (job.status !== JOB_STATUS.COMPLETED) {
    return { job: jobSummary, counterpart: null, given: null, received: null, canReview: false };
  }

  const counterpartId = isPoster ? application.student : job.poster;
  const [counterpart, reviews] = await Promise.all([
    User.findById(counterpartId).select(REVIEWER_FIELDS),
    Review.find({ job: job._id, removedByAdmin: false })
      .populate('reviewer', REVIEWER_FIELDS)
      .populate('reviewee', REVIEWER_FIELDS),
  ]);

  const given = reviews.find((review) => String(review.reviewer._id) === String(user._id)) || null;
  const received = reviews.find((review) => String(review.reviewee._id) === String(user._id)) || null;
  // Use a database lookup (not just `given`) so a review an admin removed still counts as the
  // one allowed review - removal must not let someone review twice.
  const hasReviewed = Boolean(given) || Boolean(await Review.exists({ job: job._id, reviewer: user._id }));

  return {
    job: jobSummary,
    counterpart: counterpart ? { id: counterpart.id, name: counterpart.name, role: counterpart.role } : null,
    given,
    received,
    canReview: !hasReviewed,
  };
}

// Public to any logged-in user, like profiles. Suspended users and admins have no public page.
async function getUserReviews(userId) {
  const target = await User.findOne({ _id: userId, status: USER_STATUS.ACTIVE, role: { $ne: ROLES.ADMIN } });
  if (!target) throw new AppError('User not found.', 404);

  return Review.find({ reviewee: userId, removedByAdmin: false })
    .sort({ createdAt: -1 })
    .limit(USER_REVIEW_LIMIT)
    .populate('reviewer', REVIEWER_FIELDS)
    .populate('job', 'title');
}

module.exports = { createReview, getJobReviews, getUserReviews, recalculateRatingSummary };
