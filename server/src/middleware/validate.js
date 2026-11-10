const AppError = require('../utils/AppError');

// validate(schema) checks req.body; validate(schema, 'params') checks req.params, etc.
// On success the cleaned data replaces the original, so controllers only see safe values.
function validate(schema, source = 'body') {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join('.') || source,
        message: issue.message,
      }));
      return next(new AppError('Please check the highlighted fields.', 400, { errors }));
    }
    req[source] = result.data;
    return next();
  };
}

module.exports = validate;
