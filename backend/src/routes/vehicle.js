const express = require('express');
const router = express.Router();

// Import controllers
const {
  getUserVehicles,
  addVehicle,
  updateVehicle,
  deleteVehicle,
  getVehicleById
} = require('../controllers/vehicleController');

// Import middleware
const { authMiddleware } = require('../middleware/authMiddleware');
const {
  validateVehicle,
  validateId
} = require('../middleware/validate');

// Protected routes (authentication required)

/**
 * @route   GET /api/vehicles/user
 * @desc    Get user's vehicles
 * @access  Private
 */
router.get('/user', authMiddleware, getUserVehicles);

/**
 * @route   GET /api/vehicles/:id
 * @desc    Get vehicle by ID
 * @access  Private
 */
router.get('/:id', authMiddleware, validateId('id'), getVehicleById);

/**
 * @route   POST /api/vehicles
 * @desc    Add new vehicle
 * @access  Private
 */
router.post('/', authMiddleware, validateVehicle, addVehicle);

/**
 * @route   PUT /api/vehicles/:id
 * @desc    Update vehicle
 * @access  Private
 */
router.put('/:id', authMiddleware, validateId('id'), validateVehicle, updateVehicle);

/**
 * @route   DELETE /api/vehicles/:id
 * @desc    Delete vehicle
 * @access  Private
 */
router.delete('/:id', authMiddleware, validateId('id'), deleteVehicle);

module.exports = router;