// Frontend validation gives fast feedback. The server repeats every check, because the
// browser can never be trusted. Each function returns { fieldName: message } (empty = valid).

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function tooLong(value, max, label) {
  return value.trim().length > max ? `${label} must be at most ${max} characters.` : '';
}

export function validatePassword(password) {
  if (!password) return 'Password is required.';
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (password.length > 72) return 'Password must be at most 72 characters.';
  if (!/[A-Za-z]/.test(password)) return 'Password must contain at least one letter.';
  if (!/\d/.test(password)) return 'Password must contain at least one number.';
  return '';
}

function validateName(name) {
  const trimmed = name.trim();
  if (!trimmed) return 'Name is required.';
  if (trimmed.length < 2) return 'Name must be at least 2 characters.';
  if (trimmed.length > 80) return 'Name must be at most 80 characters.';
  return '';
}

function clean(errors) {
  return Object.fromEntries(Object.entries(errors).filter(([, message]) => message));
}

export function validateLogin({ email, password }) {
  return clean({
    email: email.trim() ? '' : 'Email is required.',
    password: password ? '' : 'Password is required.',
  });
}

export function validateRegister(values) {
  const email = values.email.trim();
  return clean({
    name: validateName(values.name),
    email: !email ? 'Email is required.' : !EMAIL_PATTERN.test(email) ? 'Enter a valid email address.' : '',
    password: validatePassword(values.password),
    confirmPassword: values.password === values.confirmPassword ? '' : 'Passwords do not match.',
    university: tooLong(values.university, 120, 'University'),
    organizationName: tooLong(values.organizationName, 120, 'Organization name'),
  });
}

function validateCommonProfile(values) {
  return {
    name: validateName(values.name),
    location: tooLong(values.location, 100, 'Location'),
    bio: tooLong(values.bio, 1000, 'This section'),
  };
}

export function validateStudentProfile(values) {
  return clean({
    ...validateCommonProfile(values),
    university: tooLong(values.university, 120, 'University'),
    department: tooLong(values.department, 120, 'Department'),
    experience: tooLong(values.experience, 2000, 'Experience'),
    skills: values.skills.length > 20 ? 'You can add up to 20 skills.' : '',
  });
}

export function validatePosterProfile(values) {
  const website = values.website.trim();
  return clean({
    ...validateCommonProfile(values),
    organizationName: tooLong(values.organizationName, 120, 'Organization name'),
    website:
      website.length > 200
        ? 'Website must be at most 200 characters.'
        : website && !/^https?:\/\//i.test(website)
          ? 'Website must start with http:// or https://.'
          : '',
  });
}
