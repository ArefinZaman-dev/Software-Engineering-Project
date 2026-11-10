const AppError = require('../utils/AppError');
const config = require('../config/env');
const logger = require('../utils/logger');

function notFound(req, _res, next) {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
}

// Turns any error into the standard shape { success:false, status, message, errors? }.
// Technical details are logged on the server but never sent to the client.
function errorHandler(err, _req, res, _next) {
  let statusCode = 500;
  let message = 'Something went wrong on our side. Please try again.';
  let code;
  let errors;

  if (err instanceof AppError) {
    ({ statusCode, message, code, errors } = err);
  } else if (err.name === 'ValidationError' && err.errors) {
    statusCode = 400;
    message = 'Please check the highlighted fields.';
    errors = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = 'The provided ID is not valid.';
  } else if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyPattern || {})[0] || 'value';
    message = field === 'email' ? 'An account with this email already exists.' : `This ${field} already exists.`;
  } else if (err.type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'The request body is not valid JSON.';
  } else if (err.type === 'entity.too.large') {
    statusCode = 413;
    message = 'The request is too large.';
  } else if (!config.isTest) {
    // Unexpected error: log it for developers, keep the client message generic.
    logger.error(err);
  }

  const body = { success: false, status: statusCode, message };
  if (code) body.code = code;
  if (errors) body.errors = errors;
  res.status(statusCode).json(body);
}

module.exports = { notFound, errorHandler };
