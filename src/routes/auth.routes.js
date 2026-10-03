const router = require('express').Router();
const authController = require('../controllers/auth.controller');
const authValidator = require('../validators/auth.validator');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');

router.post('/register', authValidator.register, validate, authController.register);
router.post('/login', authValidator.login, validate, authController.login);
router.get('/profile', protect, authController.getProfile);

module.exports = router;
