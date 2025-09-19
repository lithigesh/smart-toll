const express = require('express');
const router = express.Router();

const {
  getDashboard,
  getUserVehicles,
  addVehicle,
  updateVehicle,
  deleteVehicle,
  getTollGates
} = require('../controllers/dashboardController');

const { authMiddleware } = require('../middleware/authMiddleware');
const {
  validateVehicleRegistration,
  validateId,
  validatePagination,
  sanitizeVehicleNumber
} = require('../middleware/validate');
const { body } = require('express-validator');

router.use(authMiddleware);

router.get('/', getDashboard);

router.get('/vehicles', getUserVehicles);

router.post('/vehicles', [
  sanitizeVehicleNumber,
  validateVehicleRegistration
], addVehicle);

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

router.delete('/vehicles/:vehicleId', [
  validateId('vehicleId')
], deleteVehicle);

router.get('/toll-gates', validatePagination, getTollGates);

module.exports = router;
