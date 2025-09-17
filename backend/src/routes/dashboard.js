const express = require('express');
const router = express.Router();

// Import controllers
const {
  getDashboard,
  getUserVehicles,
  addVehicle,
  updateVehicle,
  deleteVehicle,
  getTollGates
} = require('../controllers/dashboardController');

// Import middleware
const { authMiddleware } = require('../middleware/authMiddleware');
const {
  validateVehicleRegistration,
  validateId,
  validatePagination,
  sanitizeVehicleNumber
} = require('../middleware/validate');
const { body } = require('express-validator');

// All dashboard routes require authentication
router.use(authMiddleware);

/**
 * @route   GET /api/dashboard
 * @desc    Get dashboard data for the authenticated user
 * @access  Private
 */
router.get('/', getDashboard);

/**
 * @route   GET /api/dashboard/vehicles
 * @desc    Get user vehicles with their statistics
 * @access  Private
 */
router.get('/vehicles', getUserVehicles);

/**
 * @route   POST /api/dashboard/vehicles
 * @desc    Add a new vehicle
 * @access  Private
 */
router.post('/vehicles', [
  sanitizeVehicleNumber,
  validateVehicleRegistration
], addVehicle);

/**
 * @route   PUT /api/dashboard/vehicles/:vehicleId
 * @desc    Update vehicle information
 * @access  Private
 */
router.put('/vehicles/:vehicleId', [
  validateId('vehicleId'),
  sanitizeVehicleNumber,
  body('vehicle_no')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Vehicle number is required')
    .isLength({ min: 4, max: 20 })
    .withMessage('Vehicle number must be between 4 and 20 characters'),
  
  body('vehicle_type')
    .optional()
    .trim()
    .isIn(['car', 'truck', 'bus', 'motorcycle', 'auto', 'other'])
    .withMessage('Invalid vehicle type')
], updateVehicle);

/**
 * @route   DELETE /api/dashboard/vehicles/:vehicleId
 * @desc    Delete a vehicle
 * @access  Private
 */
router.delete('/vehicles/:vehicleId', [
  validateId('vehicleId')
], deleteVehicle);

/**
 * @route   GET /api/dashboard/toll-gates
 * @desc    Get toll gates information
 * @access  Private
 */
router.get('/toll-gates', validatePagination, getTollGates);

module.exports = router;