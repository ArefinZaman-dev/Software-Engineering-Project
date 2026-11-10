// An error we throw on purpose (wrong password, missing resource, forbidden action...).
// The central error handler turns it into a clean JSON response.
class AppError extends Error {
  constructor(message, statusCode = 500, { code, errors } = {}) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.errors = errors;
    this.isOperational = true;
  }
}

module.exports = AppError;
