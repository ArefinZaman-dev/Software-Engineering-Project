const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const adminService = require('../services/adminService');

const getStats = asyncHandler(async (_req, res) => {
  const stats = await adminService.getStats();
  sendSuccess(res, { stats });
});

module.exports = { getStats };
