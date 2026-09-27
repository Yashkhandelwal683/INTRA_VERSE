const express = require('express');
const router = express.Router();
const {
  getMyTickets,
  getTicketById,
} = require('../controllers/attendeeTicketController');
const { verifyToken } = require('../middleware/authMiddleware');

router.use(verifyToken);

router.get('/tickets', getMyTickets);
router.get('/tickets/:id', getTicketById);

module.exports = router;
