const express = require('express');
const {
  createBooking,
  getUserBookings,
  getBookingById,
  cancelBooking,
  requestCancellation,
  adminApproveCancellation,
  getPendingCancellations,
} = require('../controllers/bookingController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

// All booking routes require authentication
router.use(verifyToken);

router.post('/',               createBooking);
router.get('/my',              getUserBookings);

// ── Cancellation Workflow ────────────────────────────────────────────────────
// Admin views all pending cancellation requests (must be BEFORE /:id catch-all)
router.get('/cancellation-requests', requireRole('admin'), getPendingCancellations);

// User requests cancellation
router.post('/:bookingId/cancel-request', requestCancellation);

// Admin approves or rejects cancellation
router.post('/:bookingId/admin-decision', requireRole('admin'), adminApproveCancellation);

// ── Existing routes ─────────────────────────────────────────────────────────
router.get('/:id',             getBookingById);
router.patch('/:id/cancel',    cancelBooking);

module.exports = router;
