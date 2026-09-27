const ApiError = require('../utils/ApiError');

/**
 * Global Express error-handling middleware.
 * Must be registered LAST in app.js (after all routes).
 *
 * Handles:
 *  - ApiError instances (operational errors — send details to client)
 *  - Mongoose ValidationError
 *  - Mongoose CastError (invalid ObjectId)
 *  - JWT errors (forwarded as ApiError by authMiddleware)
 *  - Unhandled programming errors (send generic 500)
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, _next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errors = err.errors || [];

  // Mongoose: duplicate key
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `A record with that ${field} already exists`;
    errors = [];
  }

  // Mongoose: validation error
  if (err.name === 'ValidationError') {
    statusCode = 422;
    message = 'Validation failed';
    errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
  }

  // Mongoose: bad ObjectId
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid value for field '${err.path}'`;
  }

  // Log server errors
  if (statusCode >= 500) {
    console.error('🔥  Server Error:', err);
  }

  // TEMP-DIAG: log validation failures with the offending body/fields
  if (statusCode === 422) {
    console.error('⚠️  422 on', req.method, req.originalUrl, JSON.stringify(err.errors || err.message));
  }

  res.status(statusCode).json({
    success: false,
    message,
    errors: errors.length ? errors : undefined,
    // Include stack only in development
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
