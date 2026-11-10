const Application = require('../models/Application');
const Job = require('../models/Job');
const AppError = require('../utils/AppError');
const jobService = require('./jobService');
const { APPLICATION_STATUS, JOB_STATUS, USER_STATUS, WITHDRAWN_BY } = require('../constants');

const STUDENT_FIELDS = 'name studentProfile location ratingSummary status';
const JOB_FIELDS = 'title budget status deadline poster';

// Statuses from which a poster may still act (shortlist/accept/reject).
const OPEN_FOR_DECISION = [APPLICATION_STATUS.PENDING, APPLICATION_STATUS.SHORTLISTED];
// Statuses from which a student may still withdraw.
const WITHDRAWABLE = [APPLICATION_STATUS.PENDING, APPLICATION_STATUS.SHORTLISTED, APPLICATION_STATUS.ACCEPTED];

async function apply(student, jobId, input) {
  // getPublicJob already enforces "exists, not admin-removed, poster not suspended" - the same
  // visibility rule a student uses to view the job in the first place.
  const job = await jobService.getPublicJob(jobId);

  if (job.status !== JOB_STATUS.OPEN) {
    throw new AppError('This job is not open for applications.', 409);
  }
  if (job.deadline.getTime() < Date.now()) {
    throw new AppError('The application deadline for this job has passed.', 409);
  }

  const existing = await Application.findOne({ job: jobId, student: student._id });
  if (existing) {
    // Covers both "already applied" and "previously withdrew" - Section 33 says a withdrawn
    // application can never be re-submitted, so the message does not distinguish the two.
    throw new AppError('You have already applied to this job.', 409);
  }

  try {
    const application = await Application.create({ job: jobId, student: student._id, ...input });
    return application.populate('job', JOB_FIELDS);
  } catch (error) {
    // Race guard: if two identical requests land at the same instant, the unique index catches
    // what the findOne check above could theoretically miss.
    if (error.code === 11000) throw new AppError('You have already applied to this job.', 409);
    throw error;
  }
}

// Only the job's own poster may see its applicants. A suspended student's PENDING/SHORTLISTED
// application is hidden from the poster (Section 33's suspension rule); ACCEPTED/REJECTED/
// WITHDRAWN/COMPLETED stay visible since they are historical record, not active visibility.
async function listApplicantsForJob(poster, jobId) {
  const job = await jobService.getOwnedJob(poster, jobId);
  const applications = await Application.find({ job: job._id })
    .sort({ createdAt: -1 })
    .populate('student', STUDENT_FIELDS);

  return applications.filter((application) => {
    const hiddenBecauseSuspended =
      application.student.status === USER_STATUS.SUSPENDED &&
      OPEN_FOR_DECISION.includes(application.status);
    return !hiddenBecauseSuspended;
  });
}

async function listMyApplications(student) {
  return Application.find({ student: student._id })
    .sort({ createdAt: -1 })
    .populate({ path: 'job', select: JOB_FIELDS, populate: { path: 'poster', select: 'name' } });
}

// Loads an application and checks it belongs to a job owned by `poster`. 404 either way,
// matching the same choice made for jobs (DECISIONS D24): it does not confirm to a stranger
// that a given application id belongs to some other poster's job.
async function getOwnedApplication(poster, applicationId) {
  const application = await Application.findById(applicationId).populate('job');
  if (!application || String(application.job.poster) !== String(poster._id)) {
    throw new AppError('Application not found.', 404);
  }
  return application;
}

async function getOwnStudentApplication(student, applicationId) {
  const application = await Application.findById(applicationId).populate('job');
  if (!application || String(application.student) !== String(student._id)) {
    throw new AppError('Application not found.', 404);
  }
  return application;
}

async function shortlist(poster, applicationId) {
  const application = await getOwnedApplication(poster, applicationId);
  if (application.status !== APPLICATION_STATUS.PENDING) {
    throw new AppError('Only a pending application can be shortlisted.', 409);
  }
  application.status = APPLICATION_STATUS.SHORTLISTED;
  await application.save();
  return application;
}

async function reject(poster, applicationId) {
  const application = await getOwnedApplication(poster, applicationId);
  if (!OPEN_FOR_DECISION.includes(application.status)) {
    throw new AppError('Only a pending or shortlisted application can be rejected.', 409);
  }
  application.status = APPLICATION_STATUS.REJECTED;
  await application.save();
  return application;
}

// The core business rule (Section 33): accepting one application starts the job and rejects
// every other still-open application for it, as a single all-or-nothing step. Standalone
// MongoDB (no replica set) does not support multi-document transactions, so instead of a
// transaction this uses a CONDITIONAL UPDATE on the job as an atomic guard: the update only
// succeeds if the job is still OPEN at that exact instant, which is the only moment two
// "accept" requests could otherwise race each other. See DECISIONS B6.
async function accept(poster, applicationId) {
  const application = await getOwnedApplication(poster, applicationId);
  if (!OPEN_FOR_DECISION.includes(application.status)) {
    throw new AppError('Only a pending or shortlisted application can be accepted.', 409);
  }

  const job = await Job.findOneAndUpdate(
    { _id: application.job._id, status: JOB_STATUS.OPEN },
    { status: JOB_STATUS.IN_PROGRESS, acceptedApplication: application._id },
    { new: true }
  );
  if (!job) {
    // Someone else was accepted first, or the poster closed/cancelled the job, between the
    // reads above and this update.
    throw new AppError('This job is no longer open, so this application cannot be accepted.', 409);
  }

  application.status = APPLICATION_STATUS.ACCEPTED;
  await application.save();

  await Application.updateMany(
    { job: job._id, _id: { $ne: application._id }, status: { $in: OPEN_FOR_DECISION } },
    { status: APPLICATION_STATUS.REJECTED }
  );

  return application;
}

// Withdraw is the applicant's own choice. From PENDING/SHORTLISTED it is a simple status change.
// From ACCEPTED, the job itself must reopen (Section 33): the accepted student backing out
// before completion returns the job to OPEN so the poster can accept someone else.
async function withdraw(student, applicationId) {
  const application = await getOwnStudentApplication(student, applicationId);
  if (!WITHDRAWABLE.includes(application.status)) {
    throw new AppError('This application can no longer be withdrawn.', 409);
  }

  const wasAccepted = application.status === APPLICATION_STATUS.ACCEPTED;
  application.status = APPLICATION_STATUS.WITHDRAWN;
  application.withdrawnBy = WITHDRAWN_BY.STUDENT;
  await application.save();

  if (wasAccepted) {
    // Conditional update: only reopen the job if it still points at *this* application as the
    // accepted one, in case something else already changed it.
    await Job.updateOne(
      { _id: application.job._id, acceptedApplication: application._id },
      { status: JOB_STATUS.OPEN, acceptedApplication: null }
    );
  }

  return application;
}

module.exports = {
  apply,
  listApplicantsForJob,
  listMyApplications,
  shortlist,
  reject,
  accept,
  withdraw,
};
