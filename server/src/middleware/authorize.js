const AppError = require('../utils/AppError');

// Decides what the caller may do (authorization). Must run AFTER authenticate.
function authorizeRoles(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to do this.', 403));
    }
    return next();
  };
}

// Ownership check: the :paramName in the URL must be the logged-in user's own id.
function requireSelf(paramName = 'id') {
  return (req, _res, next) => {
    if (String(req.user._id) !== req.params[paramName]) {
      return next(new AppError('You can only change your own profile.', 403));
    }
    return next();
  };
}

module.exports = { authorizeRoles, requireSelf };
