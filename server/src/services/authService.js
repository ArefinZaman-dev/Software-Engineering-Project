const User = require('../models/User');
const AppError = require('../utils/AppError');
const { hashPassword, comparePassword } = require('../utils/password');
const { signToken } = require('../utils/token');
const { ROLES, USER_STATUS, ORGANIZATION_TYPES } = require('../constants');

async function register(input) {
  const account = {
    name: input.name,
    email: input.email,
    role: input.role,
    passwordHash: await hashPassword(input.password),
  };

  if (input.role === ROLES.STUDENT) {
    account.studentProfile = { university: input.university || '' };
  } else {
    account.posterProfile = {
      organizationType: input.organizationType || ORGANIZATION_TYPES.INDIVIDUAL,
      organizationName: input.organizationName || '',
    };
  }

  // A duplicate email is caught by the unique index and becomes a 409 in the error handler.
  const user = await User.create(account);
  return { user, token: signToken(user._id) };
}

async function login(email, password) {
  const user = await User.findOne({ email }).select('+passwordHash');

  // Always run the password check, and use one message for both failures,
  // so the response never reveals whether an email is registered.
  const passwordMatches = await comparePassword(password, user && user.passwordHash);
  if (!user || !passwordMatches) {
    throw new AppError('Invalid email or password.', 401);
  }

  if (user.status !== USER_STATUS.ACTIVE) {
    throw new AppError('Your account has been suspended. Please contact support.', 403, {
      code: 'ACCOUNT_SUSPENDED',
    });
  }

  await User.updateOne({ _id: user._id }, { lastLoginAt: new Date() });
  return { user, token: signToken(user._id) };
}

module.exports = { register, login };
