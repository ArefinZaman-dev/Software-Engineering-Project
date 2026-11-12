const User = require('../models/User');
const Job = require('../models/Job');
const Application = require('../models/Application');
const Review = require('../models/Review');
const Report = require('../models/Report');
const AppError = require('../utils/AppError');
const escapeRegex = require('../utils/escapeRegex');
const reviewService = require('./reviewService');
const { ROLES, USER_STATUS, JOB_STATUS, REPORT_ACTIVE_STATUSES } = require('../constants');

function paginate(query, total) {
  return { page: query.page, limit: query.limit, total, totalPages: Math.max(1, Math.ceil(total / query.limit)) };
}

const skipFor = (query) => (query.page - 1) * query.limit;

// Admin lists show plain objects with exactly the fields an admin needs. (The User model's own
// JSON adds derived fields such as profileCompletion, which would be wrong on a partial load.)
function toAdminUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    location: user.location,
    ratingSummary: user.ratingSummary,
    createdAt: user.createdAt,
  };
}

function visibilityFilter(visibility) {
  if (visibility === 'visible') return { removedByAdmin: false };
  if (visibility === 'removed') return { removedByAdmin: true };
  return {};
}

// ---------- statistics ----------

async function getStats() {
  const [
    totalUsers,
    students,
    posters,
    suspendedUsers,
    totalJobs,
    openJobs,
    inProgressJobs,
    completedJobs,
    removedJobs,
    totalApplications,
    totalReviews,
    openReports,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: ROLES.STUDENT }),
    User.countDocuments({ role: ROLES.POSTER }),
    User.countDocuments({ status: USER_STATUS.SUSPENDED }),
    Job.countDocuments(),
    Job.countDocuments({ status: JOB_STATUS.OPEN, removedByAdmin: false }),
    Job.countDocuments({ status: JOB_STATUS.IN_PROGRESS }),
    Job.countDocuments({ status: JOB_STATUS.COMPLETED }),
    Job.countDocuments({ removedByAdmin: true }),
    Application.countDocuments(),
    Review.countDocuments({ removedByAdmin: false }),
    Report.countDocuments({ status: { $in: REPORT_ACTIVE_STATUSES } }),
  ]);

  return {
    totalUsers,
    students,
    posters,
    suspendedUsers,
    totalJobs,
    openJobs,
    inProgressJobs,
    completedJobs,
    removedJobs,
    totalApplications,
    totalReviews,
    openReports,
  };
}

// ---------- users ----------

async function listUsers(query) {
  const filter = {};
  if (query.role) filter.role = query.role;
  if (query.status) filter.status = query.status;
  if (query.search) {
    const pattern = { $regex: escapeRegex(query.search), $options: 'i' };
    filter.$or = [{ name: pattern }, { email: pattern }];
  }

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skipFor(query)).limit(query.limit),
    User.countDocuments(filter),
  ]);
  return { users: users.map(toAdminUser), pagination: paginate(query, total) };
}

// Suspending takes effect on the very next request from that user, because authenticate loads the
// account from the database every time (DECISIONS D8). Admin accounts are never touched, so an
// admin cannot lock themselves or a colleague out.
async function changeUserStatus(userId, nextStatus) {
  const user = await User.findById(userId);
  if (!user) throw new AppError('User not found.', 404);
  if (user.role === ROLES.ADMIN) {
    throw new AppError('Admin accounts cannot be suspended or reactivated.', 400);
  }
  if (user.status === nextStatus) {
    throw new AppError(
      nextStatus === USER_STATUS.SUSPENDED ? 'This user is already suspended.' : 'This user is not suspended.',
      409
    );
  }

  user.status = nextStatus;
  await user.save();
  return toAdminUser(user);
}

const suspendUser = (userId) => changeUserStatus(userId, USER_STATUS.SUSPENDED);
const reactivateUser = (userId) => changeUserStatus(userId, USER_STATUS.ACTIVE);

// ---------- jobs ----------

function toAdminJob(job) {
  return {
    id: job.id,
    title: job.title,
    status: job.status,
    budget: job.budget,
    deadline: job.deadline,
    removedByAdmin: job.removedByAdmin,
    createdAt: job.createdAt,
    poster: job.poster ? { id: job.poster.id, name: job.poster.name, email: job.poster.email } : null,
    category: job.category ? { id: job.category.id, name: job.category.name } : null,
  };
}

async function listJobs(query) {
  const filter = visibilityFilter(query.visibility);
  if (query.status) filter.status = query.status;
  if (query.search) filter.title = { $regex: escapeRegex(query.search), $options: 'i' };

  const [jobs, total] = await Promise.all([
    Job.find(filter)
      .sort({ createdAt: -1 })
      .skip(skipFor(query))
      .limit(query.limit)
      .populate('poster', 'name email')
      .populate('category', 'name'),
    Job.countDocuments(filter),
  ]);
  return { jobs: jobs.map(toAdminJob), pagination: paginate(query, total) };
}

// Removing hides the job from discovery, details, and reports (DECISIONS B1). Its applications,
// conversations, and reviews are left exactly as they are: nothing is deleted, and an admin can
// restore it at any time.
async function setJobRemoved(jobId, removed) {
  const job = await Job.findById(jobId).populate('poster', 'name email').populate('category', 'name');
  if (!job) throw new AppError('Job not found.', 404);
  if (job.removedByAdmin === removed) {
    throw new AppError(removed ? 'This job is already removed.' : 'This job is not removed.', 409);
  }

  job.removedByAdmin = removed;
  await job.save();
  return toAdminJob(job);
}

const removeJob = (jobId) => setJobRemoved(jobId, true);
const restoreJob = (jobId) => setJobRemoved(jobId, false);

// ---------- reviews ----------

function toAdminReview(review) {
  return {
    id: review.id,
    rating: review.rating,
    comment: review.comment,
    removedByAdmin: review.removedByAdmin,
    createdAt: review.createdAt,
    reviewer: review.reviewer ? { id: review.reviewer.id, name: review.reviewer.name } : null,
    reviewee: review.reviewee ? { id: review.reviewee.id, name: review.reviewee.name } : null,
    job: review.job ? { id: review.job.id, title: review.job.title } : null,
  };
}

const populateReview = (query) =>
  query.populate('reviewer', 'name').populate('reviewee', 'name').populate('job', 'title');

async function listReviews(query) {
  const filter = visibilityFilter(query.visibility);
  const [reviews, total] = await Promise.all([
    populateReview(Review.find(filter).sort({ createdAt: -1 }).skip(skipFor(query)).limit(query.limit)),
    Review.countDocuments(filter),
  ]);
  return { reviews: reviews.map(toAdminReview), pagination: paginate(query, total) };
}

// A removed review stops counting toward the reviewee's rating (DECISIONS B5), so the summary is
// recalculated straight away. It still counts as the reviewer's one review (B9).
async function setReviewRemoved(reviewId, removed) {
  const review = await populateReview(Review.findById(reviewId));
  if (!review) throw new AppError('Review not found.', 404);
  if (review.removedByAdmin === removed) {
    throw new AppError(removed ? 'This review is already removed.' : 'This review is not removed.', 409);
  }

  review.removedByAdmin = removed;
  await review.save();
  await reviewService.recalculateRatingSummary(review.reviewee._id);
  return toAdminReview(review);
}

const removeReview = (reviewId) => setReviewRemoved(reviewId, true);
const restoreReview = (reviewId) => setReviewRemoved(reviewId, false);

module.exports = {
  getStats,
  listUsers,
  suspendUser,
  reactivateUser,
  listJobs,
  removeJob,
  restoreJob,
  listReviews,
  removeReview,
  restoreReview,
};
