const express = require('express');
const router = express.Router();

const {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  logout,
  refreshToken,
  forgotPassword,
  verifyEmail
} = require('../controllers/authController');

const { authMiddleware } = require('../middleware/authMiddleware');
const {
  validateUserRegistration,
  validateUserLogin,
  handleValidationErrors
} = require('../middleware/validate');
const { body } = require('express-validator');

router.post('/register', validateUserRegistration, register);

router.post('/login', validateUserLogin, login);

router.post('/refresh', [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required'),
  handleValidationErrors
], refreshToken);

router.post('/forgot-password', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  handleValidationErrors
], forgotPassword);

router.post('/verify-email', [
  body('token')
    .notEmpty()
    .withMessage('Verification token is required'),
  handleValidationErrors
], verifyEmail);

router.get('/me', authMiddleware, getProfile);

router.put('/profile', authMiddleware, [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),
  
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('phone')
    .optional()
    .trim()
    .isMobilePhone('en-IN')
    .withMessage('Please provide a valid phone number'),
  
  handleValidationErrors
], updateProfile);

router.put('/password', authMiddleware, [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number'),
  
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match new password');
      }
      return true;
    }),
  
  handleValidationErrors
], changePassword);

router.post('/logout', authMiddleware, logout);

module.exports = router;
