const LearningResource = require('../models/LearningResource');
const Job = require('../models/Job');
const AppError = require('../utils/AppError');
const jobService = require('./jobService');
const { checkTypeRules } = require('../validators/resourceValidators');
const { MAX_RESOURCES_PER_JOB } = require('../constants');

// Oldest first, so the admin controls the order simply by the order of adding.
const ORDER = { createdAt: 1, _id: 1 }; // _id breaks a tie when two resources are added in the same millisecond

// ---------- public (students and visitors) ----------

// Resources are shown only where the job itself is shown: a removed job, or a job of a suspended
// poster, answers "not found" exactly like the job details page does.
async function listForPublicJob(jobId) {
  await jobService.getPublicJob(jobId);
  return LearningResource.find({ job: jobId }).sort(ORDER);
}

// ---------- admin ----------

async function findJobOrFail(jobId) {
  const job = await Job.findById(jobId).select('title');
  if (!job) throw new AppError('Job not found.', 404);
  return job;
}

// The admin sees the resources of any existing job, including a removed one (so they can prepare
// them before restoring it).
async function listForAdmin(jobId) {
  const job = await findJobOrFail(jobId);
  const resources = await LearningResource.find({ job: job._id }).sort(ORDER);
  return { job: { id: job.id, title: job.title }, resources };
}

async function createResource(admin, jobId, input) {
  const job = await findJobOrFail(jobId);

  const count = await LearningResource.countDocuments({ job: job._id });
  if (count >= MAX_RESOURCES_PER_JOB) {
    throw new AppError(
      `A job can have at most ${MAX_RESOURCES_PER_JOB} learning resources. Remove one before adding another.`,
      409
    );
  }

  return LearningResource.create({ ...input, job: job._id, addedBy: admin._id });
}

// A partial update is merged with what is stored, then the type rule is checked on the result.
// That is how "change the type to VIDEO but leave the link empty" is caught.
async function updateResource(resourceId, input) {
  const resource = await LearningResource.findById(resourceId);
  if (!resource) throw new AppError('Learning resource not found.', 404);

  const merged = {
    type: input.type ?? resource.type,
    url: input.url ?? resource.url,
    description: input.description ?? resource.description,
  };
  const problems = checkTypeRules(merged);
  if (problems.length > 0) throw new AppError('Please check the highlighted fields.', 400, { errors: problems });

  Object.assign(resource, input);
  await resource.save();
  return resource;
}

async function deleteResource(resourceId) {
  const resource = await LearningResource.findById(resourceId);
  if (!resource) throw new AppError('Learning resource not found.', 404);
  await resource.deleteOne();
}

module.exports = { listForPublicJob, listForAdmin, createResource, updateResource, deleteResource };
