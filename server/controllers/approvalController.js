const User = require('../models/User');
const AnalyticsSnapshot = require('../models/AnalyticsSnapshot');
const { invalidatePattern } = require('../config/redis');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const mongoose = require('mongoose');

/** Force the next /api/admin/stats request to recompute from the live DB */
const invalidateAdminStatsCache = async () => {
  await AnalyticsSnapshot.deleteOne({ type: 'admin_stats', scope: 'global' });
  await invalidatePattern('admin');
};

exports.getOrganizerRequests = async (req, res, next) => {
  try {
    const { status = 'pending', page = 1, limit = 20 } = req.query;
    const query = { role: 'organizer' };
    if (status) query.approvalStatus = status;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [users, total] = await Promise.all([
      User.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      User.countDocuments(query),
    ]);
    res.json(new ApiResponse(200, {
      requests: users,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    }));
  } catch (err) { next(err); }
};

exports.approveOrganizer = async (req, res, next) => {
  try {
    if (!req.params.id || !mongoose.Types.ObjectId.isValid(req.params.id)) {
      throw new ApiError(400, 'Invalid organizer ID');
    }
    if (!req.user || !req.user.id) {
      throw new ApiError(401, 'Authentication required');
    }

    const user = await User.findById(req.params.id);
    if (!user) throw new ApiError(404, 'User not found');
    if (user.role !== 'organizer') throw new ApiError(400, 'User is not an organizer');

    user.approved = true;
    user.approvalStatus = 'approved';
    user.approvedBy = req.user.id;
    user.approvedAt = new Date();
    user.rejectedReason = '';
    await user.save({ validateBeforeSave: false });

    await invalidateAdminStatsCache();

    const Notification = require('../models/Notification');
    const notification = await Notification.create({
      user: user._id,
      type: 'organizer_approved',
      title: 'Account Approved',
      message: 'Congratulations! Your organizer account has been approved. You can now log in and start creating events.',
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`user:${user._id}`).emit('notification:new', notification.toObject());
      io.to('admin').emit('organizer:approval', { userId: user._id, status: 'approved', name: user.name });
    }

    const { sendOrganizerApprovedEmail } = require('../services/emailService');
    sendOrganizerApprovedEmail({ user }).catch(err => {
      console.error('Failed to send approval email:', err.message);
    });

    res.json(new ApiResponse(200, { user: { id: user._id, name: user.name, email: user.email, role: user.role, approvalStatus: 'approved' } }, 'Organizer approved successfully'));
  } catch (err) {
    console.error('approveOrganizer error:', err.message || err);
    next(err);
  }
};

exports.rejectOrganizer = async (req, res, next) => {
  try {
    if (!req.params.id || !mongoose.Types.ObjectId.isValid(req.params.id)) {
      throw new ApiError(400, 'Invalid organizer ID');
    }

    const { reason } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) throw new ApiError(404, 'User not found');
    if (user.role !== 'organizer') throw new ApiError(400, 'User is not an organizer');

    user.approved = false;
    user.approvalStatus = 'rejected';
    user.rejectedReason = reason || 'Your application was rejected. Please contact support for more information.';
    await user.save({ validateBeforeSave: false });

    await invalidateAdminStatsCache();

    const Notification = require('../models/Notification');
    const notification = await Notification.create({
      user: user._id,
      type: 'organizer_rejected',
      title: 'Account Rejected',
      message: `Your organizer application has been rejected. Reason: ${user.rejectedReason}`,
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`user:${user._id}`).emit('notification:new', notification.toObject());
      io.to('admin').emit('organizer:approval', { userId: user._id, status: 'rejected', name: user.name });
    }

    const { sendOrganizerRejectedEmail } = require('../services/emailService');
    sendOrganizerRejectedEmail({ user, reason: user.rejectedReason }).catch(err => {
      console.error('Failed to send rejection email:', err.message);
    });

    res.json(new ApiResponse(200, { user: { id: user._id, name: user.name, email: user.email, role: user.role, approvalStatus: 'rejected' } }, 'Organizer rejected'));
  } catch (err) {
    console.error('rejectOrganizer error:', err.message || err);
    next(err);
  }
};
