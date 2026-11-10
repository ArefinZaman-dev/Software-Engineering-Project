const { z } = require('zod');
const { REPORT_TARGET, REPORT_REASON } = require('../constants');
const { objectId } = require('./common');

const createReportSchema = z
  .object({
    targetType: z.enum(Object.values(REPORT_TARGET), {
      errorMap: () => ({ message: 'Choose whether you are reporting a job or a user.' }),
    }),
    targetId: objectId,
    reason: z.enum(Object.values(REPORT_REASON), {
      errorMap: () => ({ message: 'Choose a reason for the report.' }),
    }),
    description: z.string().trim().max(1000, 'Description must be at most 1000 characters.').optional().default(''),
  })
  // "Other" tells an admin nothing on its own, so it needs a few words of explanation.
  .refine((data) => data.reason !== REPORT_REASON.OTHER || data.description.length >= 10, {
    path: ['description'],
    message: 'Please describe the problem (at least 10 characters) when the reason is "Other".',
  });

module.exports = { createReportSchema };
