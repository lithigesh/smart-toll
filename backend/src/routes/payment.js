const express = require('express');
const router = express.Router();

// Import controllers
const {
  createPaymentOrder,
  verifyPayment,
  handleWebhook,
  getPaymentHistory,
  getPaymentDetails
} = require('../controllers/paymentController');

// Import middleware
const { authMiddleware } = require('../middleware/authMiddleware');
const {
  validatePaymentOrder,
  validatePaymentVerification,
  validatePagination,
  validateId
} = require('../middleware/validate');

// Protected routes (authentication required)

/**
 * @route   POST /api/payment/create-order
 * @desc    Create Razorpay order for payment
 * @access  Private
 */
router.post('/create-order', authMiddleware, validatePaymentOrder, createPaymentOrder);

/**
 * @route   POST /api/payment/verify
 * @desc    Verify payment and update wallet
 * @access  Private
 */
router.post('/verify', authMiddleware, validatePaymentVerification, verifyPayment);

/**
 * @route   GET /api/payment/history
 * @desc    Get user's payment history
 * @access  Private
 */
router.get('/history', authMiddleware, validatePagination, getPaymentHistory);

/**
 * @route   GET /api/payment/:paymentId
 * @desc    Get payment details by ID
 * @access  Private
 */
router.get('/:paymentId', authMiddleware, validateId('paymentId'), getPaymentDetails);

// Public routes (for webhooks)

/**
 * @route   POST /api/payment/webhook
 * @desc    Handle Razorpay webhooks
 * @access  Public (webhook signature verification)
 * @note    This route expects raw body, configured in server.js
 */
router.post('/webhook', handleWebhook);

module.exports = router;