const express = require('express');
const router = express.Router({ mergeParams: true });
const subEventController = require('../controllers/subEventController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

router.use(verifyToken);

router.get('/organizer', requireRole('organizer', 'admin'), subEventController.getOrganizerSubEvents);
router.get('/event/:eventId', subEventController.getSubEvents);
router.post('/event/:eventId', requireRole('organizer', 'admin'), subEventController.createSubEvent);
router.get('/:id', subEventController.getSubEvent);
router.put('/:id', requireRole('organizer', 'admin'), subEventController.updateSubEvent);
router.delete('/:id', requireRole('organizer', 'admin'), subEventController.deleteSubEvent);

module.exports = router;
