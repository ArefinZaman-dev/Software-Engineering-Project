// Express 4 does not catch errors from async functions by itself.
// This wrapper forwards them to the central error handler.
module.exports = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
