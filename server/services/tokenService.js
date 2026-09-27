const jwt = require('jsonwebtoken');

/**
 * Generates a short-lived access token (default 15 m).
 * @param {{ id: string, role: string }} payload
 * @returns {string} signed JWT
 */
const generateAccessToken = (payload) =>
  jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m',
  });

/**
 * Generates a long-lived refresh token (default 7 d).
 * @param {{ id: string }} payload
 * @returns {string} signed JWT
 */
const generateRefreshToken = (payload) =>
  jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d',
  });

/**
 * Verifies a refresh token.
 * @param {string} token
 * @returns {object} decoded payload
 * @throws {JsonWebTokenError | TokenExpiredError}
 */
const verifyRefreshToken = (token) =>
  jwt.verify(token, process.env.JWT_REFRESH_SECRET);

module.exports = { generateAccessToken, generateRefreshToken, verifyRefreshToken };
