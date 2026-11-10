const rateLimit = require('express-rate-limit');
const AppError = require('../utils/AppError');
const config = require('../config/env');

function createLimiter({ windowMs, limit }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: () => config.isTest,
    handler: (_req, _res, next) =>
      next(new AppError('Too many requests. Please wait a few minutes and try again.', 429)),
  });
}

// Strict limit on login/register to slow down password guessing.
const authLimiter = createLimiter({ windowMs: 15 * 60 * 1000, limit: 30 });
// General protection for the whole API.
const apiLimiter = createLimiter({ windowMs: 15 * 60 * 1000, limit: 600 });

module.exports = { authLimiter, apiLimiter };
