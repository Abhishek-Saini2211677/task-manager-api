const { body } = require('express-validator');

const register = [
  body('name').trim().notEmpty().withMessage('Name is required').bail()
    .isLength({ max: 50 }).withMessage('Name must be at most 50 characters'),
  body('email').trim().notEmpty().withMessage('Email is required').bail()
    .isEmail().withMessage('Email must be valid').normalizeEmail(),
  body('password').isString().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

const login = [
  body('email').trim().notEmpty().withMessage('Email is required').bail()
    .isEmail().withMessage('Email must be valid').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

module.exports = { register, login };
