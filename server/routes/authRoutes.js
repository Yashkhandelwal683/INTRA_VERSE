const express = require('express');
const passport = require('passport');
const { body } = require('express-validator');
const {
  register,
  login,
  logout,
  refreshToken,
  googleCallback,
} = require('../controllers/authController');
const { verifyToken } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// ── Validation chains ─────────────────────────────────────────────────────────
const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('role').optional().isIn(['attendee', 'organizer']).withMessage('Invalid role'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/\d/)
    .withMessage('Password must contain at least one number'),
  body('organizationName').if(body('role').equals('organizer')).trim().notEmpty().withMessage('Organization name is required'),
  body('phone').if(body('role').equals('organizer')).trim().notEmpty().withMessage('Phone number is required'),
  body('city').if(body('role').equals('organizer')).trim().notEmpty().withMessage('City is required'),
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

// ── Middleware: Validate CLIENT_URL on OAuth routes ────────────────────────────
const validateOAuthEnvironment = (req, res, next) => {
  if (!process.env.CLIENT_URL) {
    console.error('❌ CLIENT_URL environment variable is not set');
    return res.status(500).json({ success: false, message: 'Server misconfiguration' });
  }
  next();
};

// ── Google OAuth ──────────────────────────────────────────────────────────────
// GET /api/auth/google — stores role in cookie, then redirects to Google
router.get('/google', (req, res, next) => {
  const role = req.query.state === 'organizer' ? 'organizer' : 'attendee';
  res.cookie('oauth_role', role, { maxAge: 10 * 60 * 1000, sameSite: 'lax' });

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    const failureUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/login?error=google_not_configured`;
    return res.redirect(failureUrl);
  }

  next();
}, passport.authenticate('google', { scope: ['profile', 'email'], session: false }));

// GET /api/auth/google/callback
// ✅ Dynamic redirect instead of hardcoded template literal
router.get(
  '/google/callback',
  validateOAuthEnvironment,
  passport.authenticate('google', { session: false }),
  (req, res, next) => {
    // Handle failure scenario (user cancelled or error)
    if (!req.user) {
      const failureUrl = `${process.env.CLIENT_URL}/login?error=oauth_failed`;
      return res.redirect(failureUrl);
    }
    // Success: call googleCallback
    next();
  },
  googleCallback
);

// ── Email + Password ──────────────────────────────────────────────────────────
// POST /api/auth/register
router.post('/register', authLimiter, registerValidation, register);

// POST /api/auth/login
router.post('/login', authLimiter, loginValidation, login);

// POST /api/auth/logout
router.post('/logout', verifyToken, logout);

// POST /api/auth/refresh-token
router.post('/refresh-token', refreshToken);

// Alias: /api/auth/refresh (client uses this path)
router.post('/refresh', refreshToken);

module.exports = router;
