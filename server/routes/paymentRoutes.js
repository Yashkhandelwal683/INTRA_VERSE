const express = require('express');
const {
  createOrder,
  verifyPayment,
  getPaymentById,
} = require('../controllers/paymentController');
const { verifyToken } = require('../middleware/authMiddleware');
const { paymentLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.use(verifyToken);

router.post('/create-order', paymentLimiter, createOrder);
router.post('/verify', verifyPayment);
router.get('/:id', getPaymentById);

module.exports = router;
