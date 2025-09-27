const express = require('express');
const router = express.Router();

// Import controllers
const {
  processPendingToll,
  getPendingTolls,
  simulateTollFare,
  getTollStats,
  cancelPendingTolls,
  getActiveJourneys,
  cancelActiveJourney,
  testTollGateDetection
} = require('../controllers/tollController');

// Import middleware
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');
const {
  validateId,
  validatePagination,
  validateDateRange
} = require('../middleware/validate');
const { body, param, query } = require('express-validator');

// Public routes (for vehicle detection systems)

/**
 * @route   POST /api/toll/process-pending
 * @desc    Process pending toll payment when vehicle reaches toll gate
 * @access  Public (or protected with API key in production)
 * @note    This is the critical endpoint for toll gate systems to process pending tolls
 */
router.post('/process-pending', [
  body('license_plate')
    .trim()
    .notEmpty()
    .withMessage('License plate is required')
    .isLength({ min: 3, max: 15 })
    .withMessage('License plate must be between 3 and 15 characters'),
  body('toll_gate_id')
    .notEmpty()
    .withMessage('Toll gate ID is required')
    .isUUID()
    .withMessage('Toll gate ID must be a valid UUID'),
  body('timestamp')
    .optional()
    .isISO8601()
    .withMessage('Timestamp must be a valid ISO 8601 date')
], processPendingToll);

/**
 * @route   POST /api/toll/test-gate-detection
 * @desc    Test endpoint for toll gate detection
 * @access  Public (for testing purposes)
 */
router.post('/test-gate-detection', [
  body('license_plate')
    .trim()
    .notEmpty()
    .withMessage('License plate is required'),
  body('toll_gate_id')
    .notEmpty()
    .withMessage('Toll gate ID is required'),
  body('detection_type')
    .optional()
    .isIn(['entry_gate', 'exit_gate', 'payment_gate'])
    .withMessage('Detection type must be entry_gate, exit_gate, or payment_gate')
], testTollGateDetection);

// Protected routes (require authentication)

/**
 * @route   GET /api/toll/pending/:userId
 * @desc    Get pending toll summary for a user
 * @access  Private
 */
router.get('/pending/:userId', [
  authMiddleware,
  param('userId')
    .isUUID()
    .withMessage('User ID must be a valid UUID')
], getPendingTolls);

/**
 * @route   POST /api/toll/simulate
 * @desc    Simulate toll fare calculation
 * @access  Private
 */
router.post('/simulate', [
  authMiddleware,
  body('userId')
    .isUUID()
    .withMessage('User ID must be a valid UUID'),
  body('distanceKm')
    .isNumeric()
    .withMessage('Distance must be a number')
    .custom((value) => {
      if (value <= 0) {
        throw new Error('Distance must be greater than 0');
      }
      if (value > 1000) {
        throw new Error('Distance cannot exceed 1000 km');
      }
      return true;
    }),
  body('vehicleType')
    .isIn(['car', 'truck', 'bus', 'bike'])
    .withMessage('Vehicle type must be car, truck, bus, or bike'),
  body('vehicleId')
    .optional()
    .isUUID()
    .withMessage('Vehicle ID must be a valid UUID'),
  body('tollRoadId')
    .optional()
    .isString()
    .withMessage('Toll road ID must be a string')
], simulateTollFare);

/**
 * @route   GET /api/toll/stats
 * @desc    Get overall toll processing statistics
 * @access  Private
 */
router.get('/stats', [
  authMiddleware,
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date')
], getTollStats);

/**
 * @route   GET /api/toll/stats/:userId
 * @desc    Get toll processing statistics for a specific user
 * @access  Private
 */
router.get('/stats/:userId', [
  authMiddleware,
  param('userId')
    .isUUID()
    .withMessage('User ID must be a valid UUID'),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date')
], getTollStats);

// Admin routes

/**
 * @route   GET /api/toll/active-journeys
 * @desc    Get all active journeys (admin/monitoring)
 * @access  Admin
 */
router.get('/active-journeys', [
  authMiddleware,
  adminMiddleware
], getActiveJourneys);

/**
 * @route   POST /api/toll/cancel-journey
 * @desc    Cancel an active journey (emergency function)
 * @access  Admin
 */
router.post('/cancel-journey', [
  authMiddleware,
  adminMiddleware,
  body('journeyId')
    .isUUID()
    .withMessage('Journey ID must be a valid UUID'),
  body('reason')
    .optional()
    .isString()
    .withMessage('Reason must be a string')
    .isLength({ max: 255 })
    .withMessage('Reason cannot exceed 255 characters')
], cancelActiveJourney);

/**
 * @route   POST /api/toll/cancel-pending
 * @desc    Cancel pending toll transactions (admin function)
 * @access  Admin
 */
router.post('/cancel-pending', [
  authMiddleware,
  adminMiddleware,
  body('transactionIds')
    .isArray({ min: 1 })
    .withMessage('Transaction IDs must be a non-empty array'),
  body('transactionIds.*')
    .isUUID()
    .withMessage('Each transaction ID must be a valid UUID'),
  body('reason')
    .optional()
    .isString()
    .withMessage('Reason must be a string')
    .isLength({ max: 255 })
    .withMessage('Reason cannot exceed 255 characters')
], cancelPendingTolls);

module.exports = router;