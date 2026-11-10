const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const categoryService = require('../services/categoryService');

const list = asyncHandler(async (_req, res) => {
  const categories = await categoryService.listActiveCategories();
  sendSuccess(res, { categories });
});

module.exports = { list };
