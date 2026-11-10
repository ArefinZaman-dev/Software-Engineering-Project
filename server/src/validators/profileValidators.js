const { z } = require('zod');
const { AVAILABILITY, ORGANIZATION_TYPES } = require('../constants');

const text = (max, label) =>
  z.string().trim().max(max, `${label} must be at most ${max} characters.`);

const name = z
  .string()
  .trim()
  .min(2, 'Name must be at least 2 characters.')
  .max(80, 'Name must be at most 80 characters.');

// Remove repeated skills, ignoring upper/lower case ("React" and "react" are the same).
function removeDuplicates(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = item.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const skills = z
  .array(
    z
      .string()
      .trim()
      .min(1, 'A skill cannot be empty.')
      .max(40, 'Each skill must be at most 40 characters.')
  )
  .max(20, 'You can add up to 20 skills.')
  .transform(removeDuplicates);

const website = text(200, 'Website').refine(
  (value) => value === '' || /^https?:\/\//i.test(value),
  'Website must start with http:// or https://.'
);

const atLeastOneField = (object) => Object.keys(object).length > 0;
const atLeastOneMessage = { message: 'Provide at least one field to update.' };

// .strict() rejects unknown fields, so "role", "email", "status" or "ratingSummary"
// in the request produce a 400 error instead of being silently ignored.
const updateStudentSchema = z
  .object({
    name: name.optional(),
    location: text(100, 'Location').optional(),
    bio: text(1000, 'Bio').optional(),
    university: text(120, 'University').optional(),
    department: text(120, 'Department').optional(),
    skills: skills.optional(),
    availability: z
      .enum(Object.values(AVAILABILITY), { errorMap: () => ({ message: 'Choose a valid availability.' }) })
      .optional(),
    experience: text(2000, 'Experience').optional(),
  })
  .strict()
  .refine(atLeastOneField, atLeastOneMessage);

const updatePosterSchema = z
  .object({
    name: name.optional(),
    location: text(100, 'Location').optional(),
    bio: text(1000, 'Description').optional(),
    organizationType: z
      .enum(Object.values(ORGANIZATION_TYPES), {
        errorMap: () => ({ message: 'Choose Individual, Business, or Organization.' }),
      })
      .optional(),
    organizationName: text(120, 'Organization name').optional(),
    website: website.optional(),
  })
  .strict()
  .refine(atLeastOneField, atLeastOneMessage);

module.exports = { updateStudentSchema, updatePosterSchema };
