const { z } = require('zod');

const applySchema = z.object({
  coverMessage: z
    .string({ required_error: 'A short cover message is required.' })
    .trim()
    .min(10, 'Cover message must be at least 10 characters.')
    .max(1000, 'Cover message must be at most 1000 characters.'),
  proposedAmount: z
    .number({ invalid_type_error: 'Proposed amount must be a number.' })
    .positive('Proposed amount must be greater than 0.')
    .max(10_000_000, 'Proposed amount is too large.')
    .optional(),
});

module.exports = { applySchema };
