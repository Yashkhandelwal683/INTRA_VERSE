require('dotenv').config();
require('express-async-errors');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const passport = require('passport');

const { connectCloudinary } = require('./config/cloudinary');
connectCloudinary();

require('./config/passport'); // registers GoogleStrategy side-effects

const { apiLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');
const apiRouter = require('./routes/index');

const app = express();

// ── Environment Validation ─────────────────────────────────────────────────────
// Validate OAuth configuration at startup
const validateOAuthConfig = () => {
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.CLIENT_URL || process.env.CLIENT_URL.includes('localhost')) {
      console.error('❌ Production Error: CLIENT_URL must be set to production frontend URL');
      console.error(`   Current: ${process.env.CLIENT_URL || 'undefined'}`);
    }
    if (!process.env.GOOGLE_CALLBACK_URL || process.env.GOOGLE_CALLBACK_URL.includes('localhost')) {
      console.error('❌ Production Error: GOOGLE_CALLBACK_URL must be set to production backend URL');
      console.error(`   Current: ${process.env.GOOGLE_CALLBACK_URL || 'undefined'}`);
    }
  }

  // Log configuration (without revealing secrets)
  if (process.env.CLIENT_URL) {
    console.log(`✅ Frontend URL: ${process.env.CLIENT_URL}`);
  }
  if (process.env.GOOGLE_CALLBACK_URL) {
    console.log(`✅ OAuth Callback: ${process.env.GOOGLE_CALLBACK_URL}`);
  }
};

validateOAuthConfig();

// Trust proxy is required when deploying behind a load balancer (like Render)
// so that req.ip and req.secure report correctly for rate limiting and cookies.
app.set('trust proxy', 1);

// ── Security / Infra middleware ───────────────────────────────────────────────
app.use(helmet());

app.use(
  cors({
    origin: [
      process.env.CLIENT_URL,
      'http://localhost:5173',
      'http://localhost:5174',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174',
    ].filter(Boolean),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Prevent browsers/proxies from caching authenticated GET responses.
// Without this, GET /api/users/profile (and similar) can be served from a
// heuristic cache, so changes saved via PATCH wouldn't appear after navigating
// back to the profile page until the cache expired.
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

// Passport (strategy only — no sessions)
app.use(passport.initialize());

// Rate-limit all /api/* requests
app.use('/api', apiLimiter);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api', apiRouter);

// Health-check
app.get('/health', (_req, res) =>
  res.json({ success: true, message: 'Server is healthy', timestamp: new Date().toISOString() })
);

// Root route
app.get('/', (_req, res) => {
  res.json({ success: true, message: 'Welcome to the Event Management API' });
});

// 404 for unmatched routes
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ── Global error handler (must be last) ───────────────────────────────────────
app.use(errorHandler);

module.exports = app;
