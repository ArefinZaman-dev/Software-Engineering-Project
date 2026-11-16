const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const resourceService = require('../services/learningResourceService');

// Public: the learning help shown on a job's page.
const listForJob = asyncHandler(async (req, res) => {
  const resources = await resourceService.listForPublicJob(req.params.id);
  sendSuccess(res, { resources });
});

// Admin only (the admin router checks the role).
const listForAdmin = asyncHandler(async (req, res) => {
  const { job, resources } = await resourceService.listForAdmin(req.params.id);
  sendSuccess(res, { job, resources });
});

const create = asyncHandler(async (req, res) => {
  const resource = await resourceService.createResource(req.user, req.params.id, req.body);
  sendSuccess(res, { resource }, { status: 201, message: 'Learning resource added.' });
});

const update = asyncHandler(async (req, res) => {
  const resource = await resourceService.updateResource(req.params.id, req.body);
  sendSuccess(res, { resource }, { message: 'Learning resource updated.' });
});

const remove = asyncHandler(async (req, res) => {
  await resourceService.deleteResource(req.params.id);
  sendSuccess(res, {}, { message: 'Learning resource removed.' });
});

module.exports = { listForJob, listForAdmin, create, update, remove };
