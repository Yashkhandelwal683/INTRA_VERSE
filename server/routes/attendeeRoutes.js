const express = require('express');
const router = express.Router();
const attendeeController = require('../controllers/attendeeController');
const { verifyToken } = require('../middleware/authMiddleware');

router.use(verifyToken);

router.get('/dashboard', attendeeController.getDashboard);

module.exports = router;
