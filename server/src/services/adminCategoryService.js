const Category = require('../models/Category');
const Job = require('../models/Job');
const AppError = require('../utils/AppError');

const DUPLICATE_MESSAGE = 'A category with this name already exists.';

function toAdminCategory(category, jobCount) {
  return { id: category.id, name: category.name, slug: category.slug, isActive: category.isActive, jobCount };
}

// The slug is built from the name, so a name with no English letters or digits would give an
// empty slug. Reject it with a clear message instead of storing a broken category.
function slugOrFail(name) {
  const slug = Category.slugify(name);
  if (!slug) {
    throw new AppError('Please check the highlighted fields.', 400, {
      errors: [{ field: 'name', message: 'Category name must include at least one English letter or number.' }],
    });
  }
  return slug;
}

async function listCategories() {
  const [categories, counts] = await Promise.all([
    Category.find().sort({ name: 1 }),
    Job.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]),
  ]);
  const countById = new Map(counts.map((entry) => [String(entry._id), entry.count]));
  return categories.map((category) => toAdminCategory(category, countById.get(String(category._id)) || 0));
}

async function createCategory(input) {
  const slug = slugOrFail(input.name);
  try {
    const category = await Category.create({ name: input.name, slug });
    return toAdminCategory(category, 0);
  } catch (error) {
    if (error.code === 11000) throw new AppError(DUPLICATE_MESSAGE, 409);
    throw error;
  }
}

// Deactivating hides a category from new jobs and from the public filter, but the jobs already
// using it keep working. That is why a category with jobs is deactivated, never deleted.
async function updateCategory(id, input) {
  const category = await Category.findById(id);
  if (!category) throw new AppError('Category not found.', 404);

  if (input.name !== undefined) {
    category.name = input.name;
    category.slug = slugOrFail(input.name);
  }
  if (input.isActive !== undefined) category.isActive = input.isActive;

  try {
    await category.save();
  } catch (error) {
    if (error.code === 11000) throw new AppError(DUPLICATE_MESSAGE, 409);
    throw error;
  }
  return toAdminCategory(category, await Job.countDocuments({ category: category._id }));
}

async function deleteCategory(id) {
  const category = await Category.findById(id);
  if (!category) throw new AppError('Category not found.', 404);

  const jobCount = await Job.countDocuments({ category: category._id });
  if (jobCount > 0) {
    throw new AppError('This category is used by existing jobs. Deactivate it instead of deleting it.', 409);
  }
  await category.deleteOne();
}

module.exports = { listCategories, createCategory, updateCategory, deleteCategory };
