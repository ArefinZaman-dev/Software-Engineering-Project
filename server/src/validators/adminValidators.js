const { z } = require('zod');
const { ROLES, USER_STATUS, JOB_STATUS, REPORT_STATUS } = require('../constants');

const pageFields = {
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
};

// "visible" = not removed by an admin, "removed" = removed, "all" = both.
const VISIBILITY = ['all', 'visible', 'removed'];

const listUsersQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  role: z.enum(Object.values(ROLES)).optional(),
  status: z.enum(Object.values(USER_STATUS)).optional(),
  ...pageFields,
});

const listJobsQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  status: z.enum(Object.values(JOB_STATUS)).optional(),
  visibility: z.enum(VISIBILITY).optional().default('all'),
  ...pageFields,
});

const listReviewsQuerySchema = z.object({
  visibility: z.enum(VISIBILITY).optional().default('all'),
  ...pageFields,
});

// "OPEN" is a shortcut for the two statuses an admin still has to deal with.
const listReportsQuerySchema = z.object({
  status: z.enum(['OPEN', ...Object.values(REPORT_STATUS)]).optional(),
  ...pageFields,
});

// Unknown fields (resolvedBy, status, ...) are dropped, so the server alone decides them.
const resolveReportSchema = z.object({
  note: z.string().trim().max(1000, 'Note must be at most 1000 characters.').optional().default(''),
});

const categoryName = z
  .string({ required_error: 'Category name is required.' })
  .trim()
  .min(2, 'Category name must be at least 2 characters.')
  .max(60, 'Category name must be at most 60 characters.');

const createCategorySchema = z.object({ name: categoryName });

const updateCategorySchema = z
  .object({
    name: categoryName.optional(),
    isActive: z.boolean({ invalid_type_error: 'isActive must be true or false.' }).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, { message: 'Provide a name or isActive to update.' });

module.exports = {
  listUsersQuerySchema,
  listJobsQuerySchema,
  listReviewsQuerySchema,
  listReportsQuerySchema,
  resolveReportSchema,
  createCategorySchema,
  updateCategorySchema,
};
