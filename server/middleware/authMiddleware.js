const jwt = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');

/**
 * verifyToken — middleware that reads the Bearer token from the Authorization
 * header, verifies it with JWT_ACCESS_SECRET, and attaches a minimal payload
 * to req.user = { id, role }.
 */
const verifyToken = (req, _res, next) => {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new ApiError(401, 'Access token missing or malformed');
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = { id: decoded.id, role: decoded.role };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new ApiError(401, 'Access token expired');
    }
    throw new ApiError(401, 'Invalid access token');
  }
};

/**
 * requireRole — factory middleware that asserts the authenticated user's role
 * is one of the allowed roles.
 * @param {...string} roles - allowed roles e.g. requireRole('admin', 'organizer')
 */
const requireRole = (...roles) => (req, _res, next) => {
  if (!req.user) {
    throw new ApiError(401, 'Not authenticated');
  }
  if (!roles.includes(req.user.role)) {
    throw new ApiError(403, `Role '${req.user.role}' is not authorized for this action`);
  }
  next();
};

/**
 * optionalAuth — attaches req.user if a valid Bearer token is present,
 * but does NOT block the request if there is no token (public routes that
 * also support authenticated behaviour, e.g. GET /api/events?organizer=me).
 */
const optionalAuth = (req, _res, next) => {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      req.user = { id: decoded.id, role: decoded.role };
    } catch (_err) {
      // Invalid / expired token — treat as unauthenticated
    }
  }
  next();
};

module.exports = { verifyToken, requireRole, optionalAuth };
