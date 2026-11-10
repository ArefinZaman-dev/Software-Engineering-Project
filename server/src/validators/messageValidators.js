const { z } = require('zod');
const { MESSAGE_MAX_LENGTH } = require('../constants');

const sendMessageSchema = z.object({
  body: z
    .string({ required_error: 'Write a message first.' })
    .trim()
    .min(1, 'Write a message first.')
    .max(MESSAGE_MAX_LENGTH, `Message must be at most ${MESSAGE_MAX_LENGTH} characters.`),
});

module.exports = { sendMessageSchema };
