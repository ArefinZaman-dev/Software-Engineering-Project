const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const reviewService = require('../services/reviewService');

const create = asyncHandler(async (req, res) => {
  const review = await reviewService.createReview(req.user, req.params.id, req.body);
  sendSuccess(res, { review }, { status: 201, message: 'Review submitted.' });
});

const listForJob = asyncHandler(async (req, res) => {
  const result = await reviewService.getJobReviews(req.user, req.params.id);
  sendSuccess(res, result);
});

const listForUser = asyncHandler(async (req, res) => {
  const reviews = await reviewService.getUserReviews(req.params.id);
  sendSuccess(res, { reviews });
});

module.exports = { create, listForJob, listForUser };
