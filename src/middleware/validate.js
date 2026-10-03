const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

/**
 * Runs after express-validator chains and turns failures into a 400 response.
 */
module.exports = (req, res, next) => {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const details = result.array().map((e) => ({ field: e.path || 'body', message: e.msg }));
  return next(ApiError.badRequest('Validation failed', details));
};
