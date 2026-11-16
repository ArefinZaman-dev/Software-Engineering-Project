const { z } = require('zod');
const { RESOURCE_TYPE } = require('../constants');

// Only web links are accepted. A "javascript:" or "data:" link would run code or hide the real
// destination when a student clicks it, so anything that is not http(s) is rejected.
function isWebLink(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

const title = z
  .string({ required_error: 'Title is required.' })
  .trim()
  .min(3, 'Title must be at least 3 characters.')
  .max(120, 'Title must be at most 120 characters.');

const type = z.enum(Object.values(RESOURCE_TYPE), {
  errorMap: () => ({ message: `Type must be one of: ${Object.values(RESOURCE_TYPE).join(', ')}.` }),
});

// An empty string means "no link". Anything else must be a real http(s) link.
const url = z
  .string()
  .trim()
  .max(500, 'Link must be at most 500 characters.')
  .refine((value) => value === '' || isWebLink(value), 'Enter a valid link that starts with http:// or https://');

const description = z.string().trim().max(1000, 'Description must be at most 1000 characters.');
const skill = z.string().trim().max(40, 'Skill label must be at most 40 characters.');

// The rule that depends on the type: a note carries text, every other type carries a link.
// Used for creating (here) and for updating (the service applies it to the merged result).
function checkTypeRules({ type: resourceType, url: link, description: text }) {
  const problems = [];
  if (resourceType === RESOURCE_TYPE.NOTE) {
    if (!text) problems.push({ field: 'description', message: 'A note needs some text in the description.' });
  } else if (!link) {
    problems.push({ field: 'url', message: 'This type of resource needs a link.' });
  }
  return problems;
}

// Unknown fields (job, addedBy, ...) are dropped, so the server alone decides them.
const createResourceSchema = z
  .object({
    title,
    type,
    url: url.optional().default(''),
    description: description.optional().default(''),
    skill: skill.optional().default(''),
  })
  .superRefine((data, ctx) => {
    checkTypeRules(data).forEach(({ field, message }) => ctx.addIssue({ code: 'custom', path: [field], message }));
  });

// Strict: trying to send "job" (move it to another job) is an error, not silently ignored.
const updateResourceSchema = z
  .object({
    title: title.optional(),
    type: type.optional(),
    url: url.optional(),
    description: description.optional(),
    skill: skill.optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, { message: 'Provide at least one field to update.' });

module.exports = { createResourceSchema, updateResourceSchema, checkTypeRules, isWebLink };
