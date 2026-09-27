const Notification = require('../models/Notification');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');

exports.getNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, unread } = req.query;
    const query = { user: req.user.id };
    if (unread === 'true') query.isRead = false;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      Notification.countDocuments({ user: req.user.id }),
      Notification.countDocuments({ user: req.user.id, isRead: false }),
    ]);
    res.json(new ApiResponse(200, {
      notifications,
      unreadCount,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    }));
  } catch (err) { next(err); }
};

exports.markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { isRead: true },
      { new: true }
    );
    if (!notification) throw new ApiError(404, 'Notification not found');
    res.json(new ApiResponse(200, { notification }));
  } catch (err) { next(err); }
};

exports.markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { user: req.user.id, isRead: false },
      { isRead: true }
    );
    res.json(new ApiResponse(200, null, 'All notifications marked as read'));
  } catch (err) { next(err); }
};

exports.createNotification = async (userId, type, title, message, data = {}, io = null) => {
  try {
    const notification = await Notification.create({ user: userId, type, title, message, data });
    if (io) {
      io.to(`user:${userId}`).emit('notification:new', notification.toObject());
    }
    return notification;
  } catch (err) {
    console.error('Failed to create notification:', err.message);
  }
};
