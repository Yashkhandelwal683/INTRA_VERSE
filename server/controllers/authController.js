const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../services/tokenService');

/** Shared cookie options for the httpOnly refresh token */
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Issues tokens, persists refresh token hash, sets cookie, returns access token */
const issueTokens = async (user, res) => {
  const payload = { id: user._id, role: user.role };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken({ id: user._id });

  // Store hashed refresh token in DB (so it can be invalidated)
  const salt = await bcrypt.genSalt(10);
  user.refreshToken = await bcrypt.hash(refreshToken, salt);
  await user.save({ validateBeforeSave: false });

  res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);
  return accessToken;
};

// ── POST /api/auth/register ───────────────────────────────────────────────────
const register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(422, 'Validation failed', errors.array());
  }

  const { name, email, password, role = 'attendee' } = req.body;

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) throw new ApiError(409, 'An account with this email already exists');

  const userFields = { name, email, password, isVerified: true, role };

  if (role === 'organizer') {
    userFields.approvalStatus = 'pending';
    userFields.approved = false;
    userFields.organizationName = req.body.organizationName || '';
    userFields.phone = req.body.phone || '';
    userFields.city = req.body.city || '';
  }

  const user = await User.create(userFields);

  // Notify admin when organizer registers
  if (role === 'organizer') {
    try {
      const { sendOrganizerRequestToAdmin } = require('../services/emailService');
      await sendOrganizerRequestToAdmin({
        organizer: { name, email, organizationName: req.body.organizationName, phone: req.body.phone, city: req.body.city },
      });
    } catch (err) {
      console.error('Failed to send organizer registration email to admin:', err.message);
    }
  }

  res.status(201).json(
    new ApiResponse(201, {
      user: { id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar, approvalStatus: user.approvalStatus, approved: user.approved },
      message: role === 'organizer'
        ? 'Registration successful. Your account is pending admin approval.'
        : 'Registration successful',
    }, role === 'organizer' ? 'Organizer registration submitted for approval' : 'Registration successful')
  );
};

// ── POST /api/auth/login ──────────────────────────────────────────────────────
const login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(422, 'Validation failed', errors.array());
  }

  const { email, password } = req.body;

  // Explicitly select password (it is select:false by default)
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user || !user.password) throw new ApiError(401, 'Invalid email or password');

  const isMatch = await user.comparePassword(password);
  if (!isMatch) throw new ApiError(401, 'Invalid email or password');

  // Check organizer approval
  if (user.role === 'organizer' && !user.approved) {
    throw new ApiError(403, user.approvalStatus === 'rejected'
      ? `Your organizer account has been rejected. Reason: ${user.rejectedReason || 'No reason provided.'}`
      : 'Your organizer account is pending admin approval. Please wait for an administrator to approve your account.');
  }

  const accessToken = await issueTokens(user, res);

  res.json(
    new ApiResponse(200, {
      user: { id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar, approvalStatus: user.approvalStatus, approved: user.approved },
      accessToken,
    }, 'Login successful')
  );
};

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
const logout = async (req, res) => {
  const token = req.cookies?.refreshToken;

  if (token) {
    // Invalidate stored refresh token
    const user = await User.findById(req.user?.id).select('+refreshToken');
    if (user) {
      user.refreshToken = undefined;
      await user.save({ validateBeforeSave: false });
    }
  }

  res.clearCookie('refreshToken', { httpOnly: true, sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', secure: process.env.NODE_ENV === 'production' });
  res.json(new ApiResponse(200, null, 'Logged out successfully'));
};

// ── POST /api/auth/refresh-token ──────────────────────────────────────────────
const refreshToken = async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) throw new ApiError(401, 'No refresh token provided');

  let decoded;
  try {
    decoded = verifyRefreshToken(token);
  } catch {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }

  const user = await User.findById(decoded.id).select('+refreshToken');
  if (!user || !user.refreshToken) throw new ApiError(401, 'Refresh token revoked');

  const isValid = await bcrypt.compare(token, user.refreshToken);
  if (!isValid) throw new ApiError(401, 'Refresh token mismatch');

  const newAccessToken = await issueTokens(user, res); // rotates refresh token too

  res.json(new ApiResponse(200, { accessToken: newAccessToken }, 'Token refreshed'));
};

// ── GET /api/auth/google/callback ─────────────────────────────────────────────
// Called AFTER passport.authenticate succeeds — req.user is the Mongoose doc
// Redirects to frontend with access token
const googleCallback = async (req, res) => {
  const user = req.user;
  if (!user) throw new ApiError(401, 'Google authentication failed');

  // Check organizer approval (only if role was pre-set to organizer)
  if (user.role === 'organizer' && !user.approved) {
    // Send notification email to admin
    try {
      const { sendOrganizerRequestToAdmin } = require('../services/emailService');
      await sendOrganizerRequestToAdmin({
        organizer: { name: user.name, email: user.email, organizationName: user.organizationName, phone: user.phone, city: user.city },
      });
    } catch (err) {
      console.error('Failed to send organizer registration email to admin:', err.message);
    }

    if (!process.env.CLIENT_URL) throw new ApiError(500, 'Server configuration error');
    return res.redirect(`${process.env.CLIENT_URL}/pending-approval`);
  }

  if (!process.env.CLIENT_URL) {
    console.error('❌ CLIENT_URL environment variable is not set');
    throw new ApiError(500, 'Server configuration error');
  }

  const accessToken = await issueTokens(user, res);

  // Clear the oauth_role cookie
  res.clearCookie('oauth_role');

  const redirectUrl = `${process.env.CLIENT_URL}/auth/callback?token=${accessToken}`;
  console.log(`✅ Google OAuth successful. Redirecting to: ${redirectUrl.split('?')[0]}`);
  res.redirect(redirectUrl);
};

module.exports = { register, login, logout, refreshToken, googleCallback };
