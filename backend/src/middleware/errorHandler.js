/**
 * Central error handling middleware
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
const errorHandler = (err, req, res, next) => {
  // If response already sent, delegate to default Express error handler
  if (res.headersSent) {
    return next(err);
  }

  // Log error details
  console.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query,
    user: req.user?.id,
    timestamp: new Date().toISOString()
  });

  // Default error response
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Internal Server Error';
  let details = null;

  // Handle specific error types
  switch (err.name) {
    case 'ValidationError':
      statusCode = 400;
      message = 'Validation Error';
      details = Object.values(err.errors).map(error => ({
        field: error.path,
        message: error.message
      }));
      break;

    case 'CastError':
      statusCode = 400;
      message = 'Invalid ID format';
      break;

    case 'JsonWebTokenError':
      statusCode = 401;
      message = 'Invalid token';
      break;

    case 'TokenExpiredError':
      statusCode = 401;
      message = 'Token expired';
      break;

    case 'UnauthorizedError':
      statusCode = 401;
      message = 'Unauthorized access';
      break;

    case 'ForbiddenError':
      statusCode = 403;
      message = 'Access forbidden';
      break;

    case 'NotFoundError':
      statusCode = 404;
      message = 'Resource not found';
      break;

    case 'ConflictError':
      statusCode = 409;
      message = 'Resource conflict';
      break;

    case 'PaymentError':
      statusCode = 402;
      message = 'Payment processing error';
      break;

    default:
      // Handle database errors
      if (err.code) {
        switch (err.code) {
          case '23505': // Unique violation
            statusCode = 409;
            message = 'Resource already exists';
            if (err.detail) {
              // Extract field name from PostgreSQL error detail
              const match = err.detail.match(/Key \((.+)\)=/);
              if (match) {
                details = `${match[1]} already exists`;
              }
            }
            break;

          case '23503': // Foreign key violation
            statusCode = 400;
            message = 'Invalid reference';
            break;

          case '23502': // Not null violation
            statusCode = 400;
            message = 'Missing required field';
            if (err.column) {
              details = `${err.column} is required`;
            }
            break;

          case '22001': // String data right truncation
            statusCode = 400;
            message = 'Data too long';
            break;

          case '22003': // Numeric value out of range
            statusCode = 400;
            message = 'Numeric value out of range';
            break;

          case '42703': // Undefined column
            statusCode = 500;
            message = 'Database schema error';
            break;

          case '42P01': // Undefined table
            statusCode = 500;
            message = 'Database schema error';
            break;

          case '53300': // Too many connections
            statusCode = 503;
            message = 'Service temporarily unavailable';
            break;

          case '40001': // Serialization failure
          case '40P01': // Deadlock detected
            statusCode = 409;
            message = 'Transaction conflict - please retry';
            break;

          default:
            statusCode = 500;
            message = 'Database error';
            break;
        }
      }
      break;
  }

  // Don't expose internal errors in production
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    message = 'Internal Server Error';
    details = null;
  }

  // Send error response
  const errorResponse = {
    error: message,
    statusCode,
    timestamp: new Date().toISOString(),
    path: req.url,
    method: req.method
  };

  // Include details if available
  if (details) {
    errorResponse.details = details;
  }

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
  }

  // Include request ID if available
  if (req.id) {
    errorResponse.requestId = req.id;
  }

  res.status(statusCode).json(errorResponse);
};

/**
 * Handle 404 errors for undefined routes
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
const notFoundHandler = (req, res, next) => {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  error.name = 'NotFoundError';
  next(error);
};

/**
 * Async error wrapper to catch async function errors
 * @param {Function} fn - Async function to wrap
 * @returns {Function} - Wrapped function
 */
const asyncErrorHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Create custom error classes
 */
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AppError';
    Error.captureStackTrace(this, AppError);
  }
}

class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400);
    this.name = 'ValidationError';
    this.details = details;
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized access') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Access forbidden') {
    super(message, 403);
    this.name = 'ForbiddenError';
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

class PaymentError extends AppError {
  constructor(message = 'Payment processing error') {
    super(message, 402);
    this.name = 'PaymentError';
  }
}

/**
 * Log unhandled promise rejections
 */
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Promise Rejection:', reason);
  // Don't exit in production, just log
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

/**
 * Log uncaught exceptions
 */
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncErrorHandler,
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  PaymentError
};