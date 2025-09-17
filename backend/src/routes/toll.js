const express = require('express');
const router = express.Router();

// Import controllers
const {
  handleTollEvent,
  getTollHistory,
  getVehicleTollHistory,
  getTollGatePassages,
  getRecentPassages
} = require('../controllers/tollController');

// Import middleware
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');
const {
  validateTollEvent,
  validateId,
  validatePagination,
  validateDateRange
} = require('../middleware/validate');
const { body } = require('express-validator');

// Public routes (for vehicle detection systems)

/**
 * @route   POST /api/toll/event
 * @desc    Handle toll event when vehicle crosses toll gate
 * @access  Public (or protected with API key in production)
 * @note    This is the critical endpoint for vehicle detection systems
 */
router.post('/event', validateTollEvent, handleTollEvent);

// Protected routes (authentication required)

/**
 * @route   GET /api/toll/history
 * @desc    Get toll passage history for authenticated user
 * @access  Private
 */
router.get('/history',
  authMiddleware,
  validatePagination,
  getTollHistory
);

/**
 * @route   GET /api/toll/vehicle/:vehicleId/passages
 * @desc    Get toll passage history for a specific vehicle
 * @access  Private (vehicle owner only)
 */
router.get('/vehicle/:vehicleId/passages', 
  authMiddleware, 
  validateId('vehicleId'),
  validatePagination,
  getVehicleTollHistory
);

/**
 * @route   GET /api/toll/gate/:tollGateId/passages
 * @desc    Get toll gate passages and statistics
 * @access  Private
 */
router.get('/gate/:tollGateId/passages',
  authMiddleware,
  validateId('tollGateId'),
  validatePagination,
  validateDateRange,
  getTollGatePassages
);

/**
 * @route   GET /api/toll/recent-passages
 * @desc    Get recent toll passages across all toll gates
 * @access  Private
 */
router.get('/recent-passages',
  authMiddleware,
  validatePagination,
  getRecentPassages
);

module.exports = router;