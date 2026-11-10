const { z } = require('zod');
const { WORK_TYPE, JOB_SORT_OPTIONS } = require('../constants');
const { objectId } = require('./common');

const text = (min, max, label) =>
  z
    .string({ required_error: `${label} is required.` })
    .trim()
    .min(min, `${label} must be at least ${min} characters.`)
    .max(max, `${label} must be at most ${max} characters.`);

const skills = z
  .array(z.string().trim().min(1).max(40, 'Each skill must be at most 40 characters.'))
  .max(15, 'You can add up to 15 required skills.')
  .transform((items) => {
    const seen = new Set();
    return items.filter((item) => {
      const key = item.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  });

const budget = z
  .number({ required_error: 'Budget is required.', invalid_type_error: 'Budget must be a number.' })
  .positive('Budget must be greater than 0.')
  .max(10_000_000, 'Budget is too large.');

// Accepts an ISO date string from the browser's <input type="date">/<input type="datetime-local">.
const futureDeadline = z
  .string({ required_error: 'Deadline is required.' })
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Enter a valid deadline.')
  .transform((value) => new Date(value))
  .refine((date) => date.getTime() > Date.now(), 'Deadline must be in the future.');

const workType = z.enum(Object.values(WORK_TYPE), {
  errorMap: () => ({ message: 'Choose Remote, On-site, or Hybrid.' }),
});

const createJobSchema = z.object({
  title: text(5, 120, 'Title'),
  description: text(20, 5000, 'Description'),
  category: objectId,
  skills: skills.optional().default([]),
  budget,
  duration: text(1, 60, 'Duration'),
  location: text(1, 100, 'Location'),
  workType,
  deadline: futureDeadline,
});

const updateJobSchema = z
  .object({
    title: text(5, 120, 'Title').optional(),
    description: text(20, 5000, 'Description').optional(),
    category: objectId.optional(),
    skills: skills.optional(),
    budget: budget.optional(),
    duration: text(1, 60, 'Duration').optional(),
    location: text(1, 100, 'Location').optional(),
    workType: workType.optional(),
    deadline: futureDeadline.optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, { message: 'Provide at least one field to update.' });

// Query strings arrive as strings, so numbers and enums are coerced/validated here.
const listJobsQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  category: objectId.optional(),
  location: z.string().trim().max(100).optional(),
  workType: z.enum(Object.values(WORK_TYPE)).optional(),
  minBudget: z.coerce.number().nonnegative().optional(),
  maxBudget: z.coerce.number().nonnegative().optional(),
  sort: z.enum(Object.values(JOB_SORT_OPTIONS)).optional().default(JOB_SORT_OPTIONS.NEWEST),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(50).optional().default(12),
});

module.exports = { createJobSchema, updateJobSchema, listJobsQuerySchema };
