const express = require('express');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const {
  getEventTeam,
  getMyStaffedEvents,
  inviteMember,
  updateMemberRole,
  removeMember,
  acceptInvite,
  declineInvite,
  getTeamStats,
} = require('../controllers/eventStaffController');

const router = express.Router();

router.get('/my-events', verifyToken, getMyStaffedEvents);

router.get('/event/:eventId', verifyToken, getEventTeam);
router.get('/event/:eventId/stats', verifyToken, getTeamStats);
router.post('/event/:eventId/invite', verifyToken, inviteMember);
router.patch('/event/:eventId/:memberId/role', verifyToken, updateMemberRole);
router.delete('/event/:eventId/:memberId', verifyToken, removeMember);

router.patch('/:memberId/accept', verifyToken, acceptInvite);
router.patch('/:memberId/decline', verifyToken, declineInvite);

module.exports = router;
