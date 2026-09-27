const express = require('express');
const router = express.Router();
const qrController = require('../controllers/qrController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

router.use(verifyToken);

router.get('/event/:eventId', requireRole('organizer', 'admin'), qrController.generateEventQR);
router.post('/scan', requireRole('organizer', 'admin'), qrController.scanTicket);
router.post('/confirm-entry', requireRole('organizer', 'admin'), qrController.confirmEntry);
router.get('/attendees/event/:eventId', requireRole('organizer', 'admin'), qrController.getAttendeesByEvent);
router.get('/attendees', requireRole('organizer', 'admin'), qrController.getAttendeesByOrganizer);
router.get('/attendees/export', requireRole('organizer', 'admin'), qrController.exportAttendees);

module.exports = router;
