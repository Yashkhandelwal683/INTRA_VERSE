const express = require('express');
const {
  getProfile,
  updateProfile,
  uploadAvatar,
  getAllUsers,
  updateUserRole,
  deleteUser,
  getOrganizerEarnings,
} = require('../controllers/userController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const { uploadAvatar: uploadAvatarMiddleware } = require('../middleware/upload');

const router = express.Router();

// All user routes require authentication
router.use(verifyToken);

// Self-service
router.get('/profile',          getProfile);
router.patch('/profile',        updateProfile);
router.patch('/profile/avatar', uploadAvatarMiddleware, uploadAvatar);

// Organizer
router.get('/organizer/earnings', requireRole('organizer', 'admin'), getOrganizerEarnings);

// Admin only
router.get('/',           requireRole('admin'), getAllUsers);
router.patch('/:id/role', requireRole('admin'), updateUserRole);
router.delete('/:id',     requireRole('admin'), deleteUser);

module.exports = router;
