const jwt = require('jsonwebtoken');
const { matchedData } = require('express-validator');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { jwtSecret, jwtExpiresIn } = require('../config/env');

const signToken = (userId) => jwt.sign({ id: userId }, jwtSecret, { expiresIn: jwtExpiresIn });

/**
 * POST /api/auth/register
 */
const register = asyncHandler(async (req, res) => {
  const { name, email, password } = matchedData(req, { locations: ['body'] });

  if (await User.exists({ email })) {
    throw ApiError.conflict('Email is already registered');
  }

  const user = await User.create({ name, email, password });

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: { user, token: signToken(user._id) },
  });
});

/**
 * POST /api/auth/login
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = matchedData(req, { locations: ['body'] });

  const user = await User.findOne({ email }).select('+password');
  // Same message for both cases so we don't reveal which emails exist
  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: { user, token: signToken(user._id) },
  });
});

/**
 * GET /api/auth/profile
 */
const getProfile = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, data: { user: req.user } });
});

module.exports = { register, login, getProfile };
