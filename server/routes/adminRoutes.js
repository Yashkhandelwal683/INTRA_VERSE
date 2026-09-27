const express = require('express');
const { getAdminStats, getAdminAnalytics, getAdminEvents, getAdminRevenue, getAdminBookings, getAdminBookingStats } = require('../controllers/adminController');
const approvalController = require('../controllers/approvalController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(verifyToken, requireRole('admin'));

router.get('/stats', getAdminStats);
router.get('/analytics', getAdminAnalytics);
router.get('/events', getAdminEvents);
router.get('/revenue', getAdminRevenue);
router.get('/bookings', getAdminBookings);
router.get('/bookings/stats', getAdminBookingStats);
router.get('/organizer-approvals', approvalController.getOrganizerRequests);

module.exports = router;
