const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { verifyToken } = require('../utils/token');
const { USER_STATUS } = require('../constants');

// Runs before every protected route. It proves who the caller is (authentication).
// The account is loaded from the database on every request so that suspended or
// deleted accounts are rejected immediately, even if their token is still valid.
const authenticate = asyncHandler(async (req, _res, next) => {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    throw new AppError('Please log in to continue.', 401);
  }

  let payload;
  try {
    payload = verifyToken(token);
  } catch (error) {
    const message =
      error.name === 'TokenExpiredError'
        ? 'Your session has expired. Please log in again.'
        : 'Your login is not valid. Please log in again.';
    throw new AppError(message, 401);
  }

  const user = await User.findById(payload.sub);
  if (!user) {
    throw new AppError('This account no longer exists.', 401);
  }
  if (user.status !== USER_STATUS.ACTIVE) {
    throw new AppError('Your account has been suspended. Please contact support.', 403, {
      code: 'ACCOUNT_SUSPENDED',
    });
  }

  req.user = user;
  next();
});

module.exports = authenticate;
