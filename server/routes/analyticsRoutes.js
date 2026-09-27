const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

router.use(verifyToken);
router.use(requireRole('organizer', 'admin'));

router.get('/overview', analyticsController.getOrganizerOverview);
router.get('/revenue-chart', analyticsController.getRevenueChart);
router.get('/ticket-sales', analyticsController.getTicketSalesChart);
router.get('/top-events', analyticsController.getTopEvents);
router.get('/recent-bookings', analyticsController.getRecentBookings);
router.get('/category-distribution', analyticsController.getCategoryDistribution);

module.exports = router;
