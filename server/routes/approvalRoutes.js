const express = require('express');
const router = express.Router();
const approvalController = require('../controllers/approvalController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

router.use(verifyToken);
router.use(requireRole('admin'));

router.get('/organizer-requests', approvalController.getOrganizerRequests);
router.patch('/approve-organizer/:id', approvalController.approveOrganizer);
router.patch('/reject-organizer/:id', approvalController.rejectOrganizer);

module.exports = router;
