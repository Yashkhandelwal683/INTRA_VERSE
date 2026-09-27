const express = require('express');
const router = express.Router();
const {
  getTicketRequests,
  getTicketRequestStats,
} = require('../controllers/adminTicketController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

router.use(verifyToken, requireRole('admin'));

router.get('/ticket-requests', getTicketRequests);
router.get('/ticket-requests/stats', getTicketRequestStats);

module.exports = router;
