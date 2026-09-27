const express = require('express');
const {
  createEvent,
  validateEventBody,
  getEvents,
  getPublicEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  getFeaturedEvents,
  registerForEvent,
  getEventRegistrations,
  getOrganizerEvents,
} = require('../controllers/eventController');
const { verifyToken, requireRole, optionalAuth } = require('../middleware/authMiddleware');
const { uploadEventAssets } = require('../middleware/upload');

const router = express.Router();

router.get('/public', getPublicEvents);
router.get('/featured', getFeaturedEvents);
router.get('/', optionalAuth, getEvents);

router.get(
  '/organizer/me',
  verifyToken,
  requireRole('organizer', 'admin'),
  getOrganizerEvents
);

router.get('/:id', getEventById);

router.post(
  '/',
  verifyToken,
  requireRole('organizer', 'admin'),
  uploadEventAssets,
  validateEventBody,
  createEvent
);

router.put(
  '/:id',
  verifyToken,
  requireRole('organizer', 'admin'),
  uploadEventAssets,
  updateEvent
);

router.delete('/:id', verifyToken, requireRole('organizer', 'admin'), deleteEvent);

router.post('/:id/register', optionalAuth, registerForEvent);

router.get(
  '/:id/registrations',
  verifyToken,
  requireRole('organizer', 'admin'),
  getEventRegistrations
);

module.exports = router;
