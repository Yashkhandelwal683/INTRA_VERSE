const express = require('express');
const router = express.Router();
const {
  getOrganizerRegistrations,
  getRegistrationById,
  approveTicket,
  rejectTicket,
} = require('../controllers/ticketManagementController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

router.use(verifyToken);
router.use(requireRole('organizer', 'admin'));

router.get('/registrations', getOrganizerRegistrations);
router.get('/registrations/:id', getRegistrationById);
router.patch('/registrations/:id/approve', approveTicket);
router.patch('/registrations/:id/reject', rejectTicket);

module.exports = router;
