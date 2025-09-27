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
    .withMessage('Invalid vehicle type'),

  body('model')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Model must be 100 characters or less'),

  body('device_id')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Device ID must be 100 characters or less')
    .custom((value) => {
      if (!value) return true; // Optional field
      
      const deviceIdPatterns = [
        /^ESP32-[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}$/, 
        /^IOT-[A-Z]+-\d{3}-[A-Z0-9]+$/, 
        /^[A-Z]+-[A-Z]+-\d{3}-[A-Z]+$/, 
        /^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}$/, 
        /^QR-[A-Z0-9]{8,16}$/
      ];
      
      const isValidFormat = deviceIdPatterns.some(pattern => pattern.test(value));
      if (!isValidFormat) {
        throw new Error('Invalid device ID format');
      }
      return true;
    })
], updateVehicle);

router.delete('/vehicles/:vehicleId', [
  validateId('vehicleId')
], deleteVehicle);

router.get('/toll-gates', validatePagination, getTollGates);

module.exports = router;
