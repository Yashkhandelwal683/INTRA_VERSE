const jwt    = require('jsonwebtoken');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');

/**
 * Generates a JWT-signed, cryptographically secure QR token.
 * Signs with QR_SECRET (different from JWT_ACCESS_SECRET).
 *
 * @param {{ ticketCode: string, eventId: string, userId: string, tierName: string }} ticketData
 * @param {Date|string} eventEndTime   - token expires when event ends (min 60s)
 * @returns {string} signed JWT string
 */
const generateQRToken = (ticketData, eventEndTime) => {
  const expiresIn = Math.max(
    60, // at least 60 seconds
    Math.floor((new Date(eventEndTime) - Date.now()) / 1000)
  );

  return jwt.sign(
    {
      tc: ticketData.ticketCode,
      ei: ticketData.eventId,
      ui: ticketData.userId,
      tn: ticketData.tierName || 'General',
    },
    process.env.QR_SECRET,
    { expiresIn }
  );
};

/**
 * Renders a QR token string into a base64 PNG data-URL.
 *
 * @param {string} qrToken  - the JWT string to encode in the QR
 * @returns {Promise<string>} base64 data-URL (data:image/png;base64,...)
 */
const generateQRImage = async (qrToken) => {
  return await QRCode.toDataURL(qrToken, {
    errorCorrectionLevel: 'L',
    type:   'image/png',
    width:  600,
    margin: 4,
    color:  { dark: '#000000', light: '#FFFFFF' },
  });
};

/**
 * Main function — call this after a booking is confirmed.
 * Returns everything needed to persist on the IssuedTicket document.
 *
 * @param {{ eventId: string, userId: string, tierName: string }} bookingData
 * @param {{ endDate?: Date, startDate: Date }} event
 * @returns {Promise<{ ticketCode: string, qrToken: string, qrImage: string }>}
 */
const generateTicket = async (bookingData, event) => {
  const ticketCode = 'EVT-' + uuidv4().split('-')[0].toUpperCase();
  const eventEnd   = event.endDate || event.startDate;

  const qrToken = generateQRToken(
    {
      ticketCode,
      eventId:  bookingData.eventId,
      userId:   bookingData.userId,
      tierName: bookingData.tierName,
    },
    eventEnd
  );

  const qrImage = await generateQRImage(qrToken);

  return { ticketCode, qrToken, qrImage };
};

/**
 * Verifies a QR token and returns decoded payload.
 * Throws jwt errors (TokenExpiredError, JsonWebTokenError) on failure.
 *
 * @param {string} qrToken
 * @returns {{ ticketCode, eventId, userId, tierName, iat, exp }}
 */
const verifyQRToken = (qrToken) => {
  return jwt.verify(qrToken, process.env.QR_SECRET);
};

// Keep backward-compat export for any code using the old generateQR name
const generateQR = async (bookingRef) => {
  return await QRCode.toDataURL(String(bookingRef), {
    errorCorrectionLevel: 'H',
    margin: 2,
    width:  300,
    color:  { dark: '#1a1a2e', light: '#ffffff' },
  });
};

module.exports = { generateTicket, generateQRToken, generateQRImage, verifyQRToken, generateQR };
