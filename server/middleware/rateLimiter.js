const rateLimit = require('express-rate-limit');

const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * General API rate limiter — applied globally in app.js.
 * Production: 200 requests per IP per 15 minutes.
 * Development: 2000 requests per IP per 15 minutes (avoids hitting the limit during hot-reload / debugging).
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: NODE_ENV === 'production' ? 200 : 2000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes',
  },
});

/**
 * Strict limiter for sensitive auth endpoints (login / register).
 * Production: 10 requests per IP per 15 minutes.
 * Development: 50 per 15 minutes.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: NODE_ENV === 'production' ? 10 : 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again after 15 minutes',
  },
});

/**
 * Payment limiter — 20 per hour (50 in dev).
 */
const paymentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: NODE_ENV === 'production' ? 20 : 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many payment requests, please try again after an hour',
  },
});

module.exports = { apiLimiter, authLimiter, paymentLimiter };
