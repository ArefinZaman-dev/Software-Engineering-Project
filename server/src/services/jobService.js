const Job = require('../models/Job');
const User = require('../models/User');
const Category = require('../models/Category');
const Application = require('../models/Application');
const AppError = require('../utils/AppError');
const { JOB_STATUS, USER_STATUS, JOB_SORT_OPTIONS, WITHDRAWN_BY, APPLICATION_STATUS } = require('../constants');

const SORT_MAP = {
  [JOB_SORT_OPTIONS.NEWEST]: { createdAt: -1 },
  [JOB_SORT_OPTIONS.BUDGET_HIGH]: { budget: -1 },
  [JOB_SORT_OPTIONS.BUDGET_LOW]: { budget: 1 },
  [JOB_SORT_OPTIONS.DEADLINE_SOON]: { deadline: 1 },
};

// Fields shown on a job card / detail page. Populated so the frontend gets a name to show
// without a second request.
// "status" is included so getPublicJob can check for suspension; Job's own toJSON transform
// strips it from the response before it ever reaches a client (see models/Job.js).
const POSTER_FIELDS = 'name posterProfile location ratingSummary status';
const CATEGORY_FIELDS = 'name slug';

async function assertCategoryExists(categoryId) {
  const category = await Category.findOne({ _id: categoryId, isActive: true });
  if (!category) throw new AppError('Choose a valid category.', 400, { errors: [{ field: 'category', message: 'This category does not exist or is no longer active.' }] });
}

async function createJob(poster, input) {
  await assertCategoryExists(input.category);
  const job = await Job.create({ ...input, poster: poster._id, status: JOB_STATUS.OPEN });
  return job.populate([{ path: 'poster', select: POSTER_FIELDS }, { path: 'category', select: CATEGORY_FIELDS }]);
}

// Builds the MongoDB filter for public discovery: only open jobs, from active posters,
// not hidden by an admin, matching whatever the caller searched or filtered for.
async function buildDiscoveryFilter(query) {
  const filter = { status: JOB_STATUS.OPEN, removedByAdmin: false };

  if (query.search) filter.$text = { $search: query.search };
  if (query.category) filter.category = query.category;
  if (query.location) filter.location = { $regex: escapeRegex(query.location), $options: 'i' };
  if (query.workType) filter.workType = query.workType;
  if (query.minBudget !== undefined || query.maxBudget !== undefined) {
    filter.budget = {};
    if (query.minBudget !== undefined) filter.budget.$gte = query.minBudget;
    if (query.maxBudget !== undefined) filter.budget.$lte = query.maxBudget;
  }

  const suspendedPosterIds = await User.find({ status: USER_STATUS.SUSPENDED }).distinct('_id');
  if (suspendedPosterIds.length > 0) filter.poster = { $nin: suspendedPosterIds };

  return filter;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function listJobs(query) {
  const filter = await buildDiscoveryFilter(query);
  const sort = SORT_MAP[query.sort];
  const skip = (query.page - 1) * query.limit;

  const [jobs, total] = await Promise.all([
    Job.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(query.limit)
      .populate('poster', POSTER_FIELDS)
      .populate('category', CATEGORY_FIELDS),
    Job.countDocuments(filter),
  ]);

  return {
    jobs,
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.max(1, Math.ceil(total / query.limit)) },
  };
}

async function listMyJobs(poster) {
  return Job.find({ poster: poster._id }).sort({ createdAt: -1 }).populate('category', CATEGORY_FIELDS);
}

// Visible to the public: not removed, and the poster's account is active.
async function getPublicJob(id) {
  const job = await Job.findOne({ _id: id, removedByAdmin: false })
    .populate('poster', POSTER_FIELDS)
    .populate('category', CATEGORY_FIELDS);
  if (!job || job.poster.status === USER_STATUS.SUSPENDED) throw new AppError('Job not found.', 404);
  return job;
}

async function getOwnedJob(poster, id) {
  const job = await Job.findOne({ _id: id, poster: poster._id });
  if (!job) throw new AppError('Job not found.', 404);
  return job;
}

async function updateJob(poster, id, input) {
  const job = await getOwnedJob(poster, id);
  if (job.status !== JOB_STATUS.OPEN) {
    throw new AppError('Only an open job can be edited. Close or cancel instead.', 409);
  }
  if (input.category) await assertCategoryExists(input.category);

  Object.assign(job, input);
  await job.save();
  return job.populate([{ path: 'poster', select: POSTER_FIELDS }, { path: 'category', select: CATEGORY_FIELDS }]);
}

async function deleteJob(poster, id) {
  const job = await getOwnedJob(poster, id);
  if (job.status !== JOB_STATUS.OPEN) {
    throw new AppError('Only an open job can be deleted. Close or cancel instead.', 409);
  }
  const hasApplications = await Application.exists({ job: job._id });
  if (hasApplications) {
    throw new AppError('This job has applications and cannot be deleted. Close or cancel it instead.', 409);
  }
  await job.deleteOne();
}

async function closeJob(poster, id) {
  const job = await getOwnedJob(poster, id);
  if (job.status !== JOB_STATUS.OPEN) {
    throw new AppError('Only an open job can be closed.', 409);
  }
  job.status = JOB_STATUS.CLOSED;
  await job.save();
  return job;
}

async function cancelJob(poster, id) {
  const job = await getOwnedJob(poster, id);
  if (![JOB_STATUS.OPEN, JOB_STATUS.IN_PROGRESS].includes(job.status)) {
    throw new AppError('This job cannot be cancelled from its current status.', 409);
  }

  const acceptedApplicationId = job.acceptedApplication;
  job.status = JOB_STATUS.CANCELLED;
  await job.save();

  // The accepted student is not silently left with a stale ACCEPTED application - cancelling
  // the job withdraws it on their behalf, with a reason that distinguishes it from a student's
  // own choice to withdraw (Section 33, DECISIONS B2).
  if (acceptedApplicationId) {
    await Application.updateOne(
      { _id: acceptedApplicationId },
      { status: APPLICATION_STATUS.WITHDRAWN, withdrawnBy: WITHDRAWN_BY.POSTER_CANCELLED }
    );
  }

  return job;
}

// Only the poster can say the work is done, and only while the job is IN_PROGRESS (DECISIONS D34,
// B8). The job and its accepted application both become COMPLETED; that unlocks reviews.
async function completeJob(poster, id) {
  const job = await getOwnedJob(poster, id);
  if (job.status !== JOB_STATUS.IN_PROGRESS) {
    throw new AppError('Only a job that is in progress can be marked as completed.', 409);
  }

  // Conditional update, same idea as accept (DECISIONS B6): it only succeeds if the job is still
  // IN_PROGRESS at this exact instant, so a simultaneous cancel or second "complete" cannot both win.
  const completed = await Job.findOneAndUpdate(
    { _id: job._id, status: JOB_STATUS.IN_PROGRESS },
    { status: JOB_STATUS.COMPLETED },
    { new: true }
  );
  if (!completed) throw new AppError('This job is no longer in progress.', 409);

  if (completed.acceptedApplication) {
    await Application.updateOne(
      { _id: completed.acceptedApplication, status: APPLICATION_STATUS.ACCEPTED },
      { status: APPLICATION_STATUS.COMPLETED }
    );
  }

  return completed;
}

module.exports = {
  createJob,
  listJobs,
  listMyJobs,
  getPublicJob,
  getOwnedJob,
  updateJob,
  deleteJob,
  closeJob,
  cancelJob,
  completeJob,
};
