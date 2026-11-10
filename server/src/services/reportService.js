const Report = require('../models/Report');
const Job = require('../models/Job');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const { REPORT_TARGET, ROLES, USER_STATUS } = require('../constants');

const DUPLICATE_MESSAGE = 'You have already reported this and it is still being reviewed.';

// A person can report a job or another person. The target must be something the reporter could
// see: an admin-removed job, a suspended poster's job, a suspended user, or an admin account is
// treated as "not found". You cannot report yourself or your own job.
async function resolveJobTarget(reporter, jobId) {
  const job = await Job.findOne({ _id: jobId, removedByAdmin: false }).populate('poster', 'status');
  if (!job || job.poster.status === USER_STATUS.SUSPENDED) throw new AppError('Job not found.', 404);
  if (String(job.poster._id) === String(reporter._id)) throw new AppError('You cannot report your own job.', 400);
  return { targetJob: job._id };
}

async function resolveUserTarget(reporter, userId) {
  const target = await User.findOne({ _id: userId, status: USER_STATUS.ACTIVE, role: { $ne: ROLES.ADMIN } });
  if (!target) throw new AppError('User not found.', 404);
  if (String(target._id) === String(reporter._id)) throw new AppError('You cannot report yourself.', 400);
  return { targetUser: target._id };
}

async function createReport(reporter, input) {
  const target =
    input.targetType === REPORT_TARGET.JOB
      ? await resolveJobTarget(reporter, input.targetId)
      : await resolveUserTarget(reporter, input.targetId);

  const duplicateFilter = { reporter: reporter._id, targetType: input.targetType, isActive: true, ...target };
  if (await Report.exists(duplicateFilter)) throw new AppError(DUPLICATE_MESSAGE, 409);

  try {
    return await Report.create({
      reporter: reporter._id,
      targetType: input.targetType,
      reason: input.reason,
      description: input.description,
      ...target,
    });
  } catch (error) {
    // Race guard: the partial unique index stops two simultaneous identical reports.
    if (error.code === 11000) throw new AppError(DUPLICATE_MESSAGE, 409);
    throw error;
  }
}

module.exports = { createReport };
