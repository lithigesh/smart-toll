const { body, param, query, validationResult } = require('express-validator');

/**
 * Handle validation errors
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(error => ({
        field: error.path || error.param,
        message: error.msg,
        value: error.value
      }))
    });
  }
  
  next();
};

/**
 * Validation rules for user registration
 */
const validateUserRegistration = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  
  handleValidationErrors
];

/**
 * Validation rules for user login
 */
const validateUserLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  handleValidationErrors
];

/**
 * Validation rules for vehicle registration
 */
const validateVehicleRegistration = [
  body('vehicle_no')
    .trim()
    .notEmpty()
    .withMessage('Vehicle number is required')
    .isLength({ min: 4, max: 20 })
    .withMessage('Vehicle number must be between 4 and 20 characters')
    .matches(/^[A-Z0-9]+$/)
    .withMessage('Vehicle number can only contain uppercase letters and numbers'),
  
  body('vehicle_type')
    .optional()
    .trim()
    .isIn(['car', 'truck', 'bus', 'motorcycle', 'auto', 'other'])
    .withMessage('Invalid vehicle type'),

  body('device_id')
    .trim()
    .notEmpty()
    .withMessage('Device ID is required')
    .isLength({ max: 100 })
    .withMessage('Device ID must be 100 characters or less')
    .custom((value) => {
      // Device ID format validation
      const deviceIdPatterns = [
        /^ESP32-[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}$/, // ESP32 MAC format
        /^IOT-[A-Z]+-\d{3}-[A-Z0-9]+$/, // Custom IoT format
        /^[A-Z]+-[A-Z]+-\d{3}-[A-Z]+$/, // Custom device format
        /^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}$/, // UUID format
        /^QR-[A-Z0-9]{8,16}$/ // QR code format
      ];
      
      const isValidFormat = deviceIdPatterns.some(pattern => pattern.test(value));
      if (!isValidFormat) {
        throw new Error('Invalid device ID format. Supported formats: ESP32-MAC, IOT-DEVICE-ID, UUID, or QR-CODE');
      }
      return true;
    }),
  
  handleValidationErrors
];

/**
 * Validation rules for vehicle management (frontend form)
 */
const validateVehicle = [
  body('license_plate')
    .trim()
    .notEmpty()
    .withMessage('License plate is required')
    .isLength({ min: 4, max: 20 })
    .withMessage('License plate must be between 4 and 20 characters'),
  
  body('vehicle_type')
    .optional()
    .trim()
    .isIn(['car', 'truck', 'bus', 'bike', 'other'])
    .withMessage('Invalid vehicle type'),

  body('make')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Make must be 50 characters or less'),

  body('model')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Model must be 50 characters or less'),

  body('year')
    .optional()
    .isInt({ min: 1900, max: new Date().getFullYear() + 1 })
    .withMessage('Year must be a valid year'),

  body('color')
    .optional()
    .trim()
    .isLength({ max: 30 })
    .withMessage('Color must be 30 characters or less'),

  body('device_id')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Device ID must be 100 characters or less'),
  
  handleValidationErrors
];

/**
 * Validation rules for toll gate creation
 */
const validateTollGateCreation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Toll gate name must be between 2 and 100 characters'),
  
  body('gps_lat')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  
  body('gps_long')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
  
  body('charge')
    .isFloat({ min: 0.01 })
    .withMessage('Charge must be a positive number'),
  
  handleValidationErrors
];

/**
 * Validation rules for payment order creation
 */
const validatePaymentOrder = [
  body('amount')
    .isFloat({ min: 1, max: 50000 })
    .withMessage('Amount must be between ₹1 and ₹50,000'),
  
  handleValidationErrors
];

/**
 * Validation rules for payment verification
 */
const validatePaymentVerification = [
  body('razorpay_order_id')
    .notEmpty()
    .withMessage('Razorpay order ID is required'),
  
  body('razorpay_payment_id')
    .notEmpty()
    .withMessage('Razorpay payment ID is required'),
  
  body('razorpay_signature')
    .notEmpty()
    .withMessage('Razorpay signature is required'),
  
  handleValidationErrors
];

/**
 * Validation rules for toll event
 */
const validateTollEvent = [
  body('license_plate')
    .trim()
    .notEmpty()
    .withMessage('License plate is required')
    .isLength({ min: 4, max: 20 })
    .withMessage('License plate must be between 4 and 20 characters'),
  
  body('toll_gate_id')
    .isUUID()
    .withMessage('Valid toll gate ID (UUID) is required'),
  
  body('timestamp')
    .optional()
    .isISO8601()
    .withMessage('Timestamp must be a valid ISO 8601 date'),
  
  handleValidationErrors
];

/**
 * Validation rules for pagination parameters
 */
const validatePagination = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer'),
  
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  handleValidationErrors
];

/**
 * Validation rules for date range parameters
 */
const validateDateRange = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date')
    .custom((endDate, { req }) => {
      if (req.query.startDate && endDate < req.query.startDate) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
  
  handleValidationErrors
];

/**
 * Validation rules for ID parameters
 */
const validateId = (paramName = 'id') => [
  param(paramName)
    .isInt({ min: 1 })
    .withMessage(`${paramName} must be a positive integer`),
  
  handleValidationErrors
];

/**
 * Validation rules for search parameters
 */
const validateSearch = [
  query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search term must be between 1 and 100 characters'),
  
  handleValidationErrors
];

/**
 * Validation rules for transaction type filter
 */
const validateTransactionType = [
  query('type')
    .optional()
    .isIn(['recharge', 'deduction'])
    .withMessage('Transaction type must be either "recharge" or "deduction"'),
  
  handleValidationErrors
];

/**
 * Custom validation for Indian vehicle number format
 */
const validateIndianVehicleNumber = (value) => {
  const cleanValue = value.replace(/\s+/g, '').toUpperCase();
  const pattern = /^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{1,4}$/;
  
  if (!pattern.test(cleanValue)) {
    throw new Error('Invalid Indian vehicle number format (e.g., KA01AB1234)');
  }
  
  return true;
};

/**
 * Sanitize and format vehicle number
 */
const sanitizeVehicleNumber = (req, res, next) => {
  if (req.body.vehicle_no || req.body.vehicle_number) {
    const vehicleNo = req.body.vehicle_no || req.body.vehicle_number;
    const sanitized = vehicleNo.replace(/\s+/g, '').toUpperCase();
    req.body.vehicle_no = sanitized;
    req.body.vehicle_number = sanitized;
  }
  next();
};

/**
 * Validation for wallet balance updates (admin only)
 */
const validateBalanceUpdate = [
  body('balance')
    .isFloat({ min: 0 })
    .withMessage('Balance must be a non-negative number'),
  
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateUserRegistration,
  validateUserLogin,
  validateVehicleRegistration,
  validateVehicle,
  validateTollGateCreation,
  validatePaymentOrder,
  validatePaymentVerification,
  validateTollEvent,
  validatePagination,
  validateDateRange,
  validateId,
  validateSearch,
  validateTransactionType,
  validateIndianVehicleNumber,
  sanitizeVehicleNumber,
  validateBalanceUpdate
};