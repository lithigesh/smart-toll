const express = require('express');
const router = express.Router();

// Import controllers
const {
  getBalance,
  getTransactions,
  getDailySummary,
  getWalletStats,
  getLowBalanceAlert
} = require('../controllers/walletController');

// Import middleware
const { authMiddleware } = require('../middleware/authMiddleware');
const {
  validatePagination,
  validateDateRange,
  validateTransactionType
} = require('../middleware/validate');
const { query } = require('express-validator');

// All wallet routes require authentication
router.use(authMiddleware);

/**
 * @route   GET /api/wallet/balance
 * @desc    Get wallet balance for the authenticated user
 * @access  Private
 */
router.get('/balance', getBalance);

/**
 * @route   GET /api/wallet/transactions
 * @desc    Get transaction history for the authenticated user
 * @access  Private
 */
router.get('/transactions', [
  validatePagination,
  validateDateRange,
  validateTransactionType,
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
], getTransactions);

/**
 * @route   GET /api/wallet/daily-summary
 * @desc    Get daily transaction summary for the user
 * @access  Private
 */
router.get('/daily-summary', [
  query('days')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('Days must be between 1 and 365')
], getDailySummary);

/**
 * @route   GET /api/wallet/stats
 * @desc    Get wallet statistics for different time periods
 * @access  Private
 */
router.get('/stats', [
  query('period')
    .optional()
    .isIn(['day', 'week', 'month', 'year'])
    .withMessage('Period must be one of: day, week, month, year')
], getWalletStats);

/**
 * @route   GET /api/wallet/low-balance-alert
 * @desc    Get low balance notification status
 * @access  Private
 */
router.get('/low-balance-alert', [
  query('threshold')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Threshold must be a non-negative number')
], getLowBalanceAlert);

module.exports = router;