const ApiError = require('../utils/ApiError');
const { nodeEnv } = require('../config/env');

const notFound = (req, res, next) => {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
};

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let error = err;

  // Normalise known library errors into ApiError instances
  if (err.name === 'CastError') {
    error = ApiError.badRequest(`Invalid ${err.path}: ${err.value}`);
  } else if (err.name === 'ValidationError') {
    const details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
    error = ApiError.badRequest('Validation failed', details);
  } else if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    error = ApiError.conflict(`${field} already exists`);
  } else if (err.type === 'entity.parse.failed') {
    error = ApiError.badRequest('Malformed JSON in request body');
  } else if (!(err instanceof ApiError)) {
    error = new ApiError(500, 'Internal server error');
  }

  if (error.statusCode >= 500) console.error(err);

  const body = { success: false, message: error.message };
  if (error.details) body.errors = error.details;
  // Stack traces only outside production; never leak internals to clients in prod
  if (nodeEnv === 'development' && error.statusCode >= 500) body.stack = err.stack;

  res.status(error.statusCode).json(body);
};

module.exports = { notFound, errorHandler };
