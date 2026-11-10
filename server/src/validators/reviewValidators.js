const { z } = require('zod');
const { REVIEW_COMMENT_MAX_LENGTH } = require('../constants');

// Unknown fields (for example "reviewee" or "reviewer") are dropped by zod, so a caller can
// never choose who the review is about - the server works that out from the job.
const createReviewSchema = z.object({
  rating: z
    .number({ required_error: 'Choose a rating from 1 to 5.', invalid_type_error: 'Rating must be a number.' })
    .int('Rating must be a whole number from 1 to 5.')
    .min(1, 'Rating must be at least 1.')
    .max(5, 'Rating must be at most 5.'),
  comment: z
    .string()
    .trim()
    .max(REVIEW_COMMENT_MAX_LENGTH, `Comment must be at most ${REVIEW_COMMENT_MAX_LENGTH} characters.`)
    .optional()
    .default(''),
});

module.exports = { createReviewSchema };
