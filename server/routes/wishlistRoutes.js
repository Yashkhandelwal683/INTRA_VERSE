const express = require('express');
const { verifyToken } = require('../middleware/authMiddleware');
const {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  checkWishlist,
  toggleWishlist,
} = require('../controllers/wishlistController');

const router = express.Router();

router.get('/', verifyToken, getWishlist);
router.post('/', verifyToken, addToWishlist);
router.post('/toggle', verifyToken, toggleWishlist);
router.get('/check/:eventId', verifyToken, checkWishlist);
router.delete('/:eventId', verifyToken, removeFromWishlist);

module.exports = router;
