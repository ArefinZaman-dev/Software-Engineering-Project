const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const jobService = require('../services/jobService');

const create = asyncHandler(async (req, res) => {
  const job = await jobService.createJob(req.user, req.body);
  sendSuccess(res, { job }, { status: 201, message: 'Job published.' });
});

const list = asyncHandler(async (req, res) => {
  const { jobs, pagination } = await jobService.listJobs(req.query);
  sendSuccess(res, { jobs, pagination });
});

const mine = asyncHandler(async (req, res) => {
  const jobs = await jobService.listMyJobs(req.user);
  sendSuccess(res, { jobs });
});

const getOne = asyncHandler(async (req, res) => {
  const job = await jobService.getPublicJob(req.params.id);
  sendSuccess(res, { job });
});

const update = asyncHandler(async (req, res) => {
  const job = await jobService.updateJob(req.user, req.params.id, req.body);
  sendSuccess(res, { job }, { message: 'Job updated.' });
});

const remove = asyncHandler(async (req, res) => {
  await jobService.deleteJob(req.user, req.params.id);
  sendSuccess(res, null, { message: 'Job deleted.' });
});

const close = asyncHandler(async (req, res) => {
  const job = await jobService.closeJob(req.user, req.params.id);
  sendSuccess(res, { job }, { message: 'Job closed.' });
});

const cancel = asyncHandler(async (req, res) => {
  const job = await jobService.cancelJob(req.user, req.params.id);
  sendSuccess(res, { job }, { message: 'Job cancelled.' });
});

const complete = asyncHandler(async (req, res) => {
  const job = await jobService.completeJob(req.user, req.params.id);
  sendSuccess(res, { job }, { message: 'Job marked as completed.' });
});

module.exports = { create, list, mine, getOne, update, remove, close, cancel, complete };
