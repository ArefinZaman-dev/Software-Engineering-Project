const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const reportService = require('../services/reportService');

const create = asyncHandler(async (req, res) => {
  const report = await reportService.createReport(req.user, req.body);
  sendSuccess(res, { report }, { status: 201, message: 'Thank you. Your report has been sent to the admins.' });
});

module.exports = { create };
