const express = require('express');
const router = express.Router();
const organizerController = require('../controllers/organizerController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

router.use(verifyToken);
router.use(requireRole('organizer', 'admin'));

router.get('/dashboard', organizerController.getDashboard);
router.get('/events', organizerController.getOrganizerEvents);
router.get('/events/:eventId', organizerController.getEventDetail);
router.get('/events/:eventId/export', organizerController.exportRegistrations);
router.get('/revenue', organizerController.getRevenue);
router.get('/attendees', organizerController.getAttendees);
router.get('/analytics', organizerController.getAnalytics);

module.exports = router;
