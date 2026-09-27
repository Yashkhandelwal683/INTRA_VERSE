const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

router.get('/event/:eventId', reviewController.getEventReviews);
router.post('/', verifyToken, reviewController.createReview);
router.get('/organizer', verifyToken, requireRole('organizer', 'admin'), reviewController.getOrganizerReviews);
router.put('/:id/reply', verifyToken, requireRole('organizer', 'admin'), reviewController.replyToReview);
router.patch('/:id/toggle', verifyToken, requireRole('organizer', 'admin'), reviewController.toggleReviewVisibility);

module.exports = router;
