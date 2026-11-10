const { z } = require('zod');
const { REGISTRABLE_ROLES, ORGANIZATION_TYPES } = require('../constants');

const name = z
  .string({ required_error: 'Name is required.' })
  .trim()
  .min(2, 'Name must be at least 2 characters.')
  .max(80, 'Name must be at most 80 characters.');

const email = z
  .string({ required_error: 'Email is required.' })
  .trim()
  .toLowerCase()
  .email('Enter a valid email address.')
  .max(254, 'Email is too long.');

const password = z
  .string({ required_error: 'Password is required.' })
  .min(8, 'Password must be at least 8 characters.')
  .max(72, 'Password must be at most 72 characters.')
  .regex(/[A-Za-z]/, 'Password must contain at least one letter.')
  .regex(/\d/, 'Password must contain at least one number.');

const optionalText = (max, label) =>
  z.string().trim().max(max, `${label} must be at most ${max} characters.`).optional();

// Unknown fields (for example "status" or "ratingSummary") are dropped by zod, so a caller
// can never set them through registration.
const registerSchema = z.object({
  role: z.enum(REGISTRABLE_ROLES, {
    errorMap: () => ({ message: 'Choose Student or Poster.' }),
  }),
  name,
  email,
  password,
  university: optionalText(120, 'University'),
  organizationType: z
    .enum(Object.values(ORGANIZATION_TYPES), {
      errorMap: () => ({ message: 'Choose Individual, Business, or Organization.' }),
    })
    .optional(),
  organizationName: optionalText(120, 'Organization name'),
});

const loginSchema = z.object({
  email: z.string({ required_error: 'Email is required.' }).trim().toLowerCase().min(1, 'Email is required.'),
  password: z.string({ required_error: 'Password is required.' }).min(1, 'Password is required.'),
});

module.exports = { registerSchema, loginSchema };
