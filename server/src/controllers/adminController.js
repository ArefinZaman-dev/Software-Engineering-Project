const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const adminService = require('../services/adminService');
const adminReportService = require('../services/adminReportService');
const adminCategoryService = require('../services/adminCategoryService');

const getStats = asyncHandler(async (_req, res) => {
  const stats = await adminService.getStats();
  sendSuccess(res, { stats });
});

// ----- users -----
const listUsers = asyncHandler(async (req, res) => {
  sendSuccess(res, await adminService.listUsers(req.query));
});

const suspendUser = asyncHandler(async (req, res) => {
  const user = await adminService.suspendUser(req.params.id);
  sendSuccess(res, { user }, { message: 'User suspended.' });
});

const reactivateUser = asyncHandler(async (req, res) => {
  const user = await adminService.reactivateUser(req.params.id);
  sendSuccess(res, { user }, { message: 'User reactivated.' });
});

// ----- jobs -----
const listJobs = asyncHandler(async (req, res) => {
  sendSuccess(res, await adminService.listJobs(req.query));
});

const removeJob = asyncHandler(async (req, res) => {
  const job = await adminService.removeJob(req.params.id);
  sendSuccess(res, { job }, { message: 'Job removed from the platform.' });
});

const restoreJob = asyncHandler(async (req, res) => {
  const job = await adminService.restoreJob(req.params.id);
  sendSuccess(res, { job }, { message: 'Job restored.' });
});

// ----- reviews -----
const listReviews = asyncHandler(async (req, res) => {
  sendSuccess(res, await adminService.listReviews(req.query));
});

const removeReview = asyncHandler(async (req, res) => {
  const review = await adminService.removeReview(req.params.id);
  sendSuccess(res, { review }, { message: 'Review removed.' });
});

const restoreReview = asyncHandler(async (req, res) => {
  const review = await adminService.restoreReview(req.params.id);
  sendSuccess(res, { review }, { message: 'Review restored.' });
});

// ----- reports -----
const listReports = asyncHandler(async (req, res) => {
  sendSuccess(res, await adminReportService.listReports(req.query));
});

const startReportReview = asyncHandler(async (req, res) => {
  const report = await adminReportService.startReview(req.user, req.params.id);
  sendSuccess(res, { report }, { message: 'Report marked as under review.' });
});

const resolveReport = asyncHandler(async (req, res) => {
  const report = await adminReportService.resolveReport(req.user, req.params.id, req.body.note);
  sendSuccess(res, { report }, { message: 'Report resolved.' });
});

const dismissReport = asyncHandler(async (req, res) => {
  const report = await adminReportService.dismissReport(req.user, req.params.id, req.body.note);
  sendSuccess(res, { report }, { message: 'Report dismissed.' });
});

// ----- categories -----
const listCategories = asyncHandler(async (_req, res) => {
  const categories = await adminCategoryService.listCategories();
  sendSuccess(res, { categories });
});

const createCategory = asyncHandler(async (req, res) => {
  const category = await adminCategoryService.createCategory(req.body);
  sendSuccess(res, { category }, { status: 201, message: 'Category created.' });
});

const updateCategory = asyncHandler(async (req, res) => {
  const category = await adminCategoryService.updateCategory(req.params.id, req.body);
  sendSuccess(res, { category }, { message: 'Category updated.' });
});

const deleteCategory = asyncHandler(async (req, res) => {
  await adminCategoryService.deleteCategory(req.params.id);
  sendSuccess(res, {}, { message: 'Category deleted.' });
});

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
  listReports,
  startReportReview,
  resolveReport,
  dismissReport,
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};
