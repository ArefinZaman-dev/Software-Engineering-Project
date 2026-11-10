const Category = require('../models/Category');

async function listActiveCategories() {
  return Category.find({ isActive: true }).sort({ name: 1 });
}

module.exports = { listActiveCategories };
