const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { jwtSecret } = require('../config/env');

/**
 * Verifies the Bearer token and attaches the authenticated user to req.user.
 */
const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw ApiError.unauthorized('Authentication token missing');
  }

  let payload;
  try {
    payload = jwt.verify(token, jwtSecret);
  } catch (err) {
    throw ApiError.unauthorized(
      err.name === 'TokenExpiredError' ? 'Token has expired' : 'Invalid token'
    );
  }

  const user = await User.findById(payload.id);
  if (!user) throw ApiError.unauthorized('User no longer exists');

  req.user = user;
  next();
});

module.exports = { protect };
