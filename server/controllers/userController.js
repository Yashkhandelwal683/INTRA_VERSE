const User = require('../models/User');
const Payment = require('../models/Payment');
const Event = require('../models/Event');
const Booking = require('../models/Booking');
const IssuedTicket = require('../models/IssuedTicket');
const Review = require('../models/Review');
const Notification = require('../models/Notification');
const SubEvent = require('../models/SubEvent');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

// ── GET /api/users/profile ────────────────────────────────────────────────────
const getProfile = async (req, res) => {
  const user = await User.findById(req.user.id).select('-refreshToken');
  if (!user) throw new ApiError(404, 'User not found');
  res.json(new ApiResponse(200, user, 'Profile fetched'));
};

// ── PATCH /api/users/profile ──────────────────────────────────────────────────
const updateProfile = async (req, res) => {
  // Top-level editable scalar fields
  const allowedFields = [
    'name', 'phone', 'bio',
    'organizationName', 'organizationType', 'gstNumber', 'panNumber',
    'website', 'aboutOrganization', 'city', 'address', 'state', 'country',
  ];
  const updates = {};

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      updates[field] = typeof req.body[field] === 'string' ? req.body[field].trim() : req.body[field];
    }
  });

  // Nested objects (social links, bank details)
  if (req.body.social && typeof req.body.social === 'object') {
    const social = {};
    ['facebook', 'instagram', 'twitter', 'linkedin', 'youtube'].forEach((k) => {
      if (req.body.social[k] !== undefined) {
        social[k] = typeof req.body.social[k] === 'string' ? req.body.social[k].trim() : req.body.social[k];
      }
    });
    if (Object.keys(social).length) updates.social = social;
  }

  if (req.body.bank && typeof req.body.bank === 'object') {
    const bank = {};
    ['accountHolder', 'bankName', 'accountNumber', 'ifsc', 'upi', 'accountType'].forEach((k) => {
      if (req.body.bank[k] !== undefined) {
        bank[k] = typeof req.body.bank[k] === 'string' ? req.body.bank[k].trim() : req.body.bank[k];
      }
    });
    if (Object.keys(bank).length) updates.bank = bank;
  }

  const user = await User.findByIdAndUpdate(req.user.id, updates, {
    new: true,
    runValidators: true,
  }).select('-refreshToken');

  res.json(new ApiResponse(200, user, 'Profile updated'));
};

// ── PATCH /api/users/profile/avatar ──────────────────────────────────────────
const uploadAvatar = async (req, res) => {
  if (!req.file?.path) throw new ApiError(400, 'No image file provided');

  const user = await User.findByIdAndUpdate(
    req.user.id,
    { avatar: req.file.path },
    { new: true }
  ).select('-refreshToken');

  res.json(new ApiResponse(200, { avatar: user.avatar }, 'Avatar updated'));
};

// ── GET /api/users (admin) ────────────────────────────────────────────────────
const getAllUsers = async (req, res) => {
  const { page = 1, limit = 20, role, search } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const filter = {};
  if (role)   filter.role = role;
  if (search) filter.$or = [
    { name:  { $regex: search, $options: 'i' } },
    { email: { $regex: search, $options: 'i' } },
  ];

  const [users, total] = await Promise.all([
    User.find(filter)
      .select('-refreshToken')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    User.countDocuments(filter),
  ]);

  res.json(
    new ApiResponse(200, {
      users,
      pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
    }, 'Users fetched')
  );
};

// ── DELETE /api/users/:id (admin) ───────────────────────────────────────────
const deleteUser = async (req, res) => {
  throw new ApiError(403, 'User deletion is disabled for security reasons');
};

// ── PATCH /api/users/:id/role (admin) ────────────────────────────────────────
const updateUserRole = async (req, res) => {
  throw new ApiError(403, 'Role changes are disabled for security reasons');
};

// ── GET /api/users/organizer/earnings ──────────────────────────────────────────
const getOrganizerEarnings = async (req, res) => {
  const events = await Event.find({ organizer: req.user.id }).select('_id title');
  const eventIds = events.map(e => e._id);

  const pipeline = [
    { $match: { organizer: req.user._id || req.user.id, status: 'completed' } },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$amount' },
        totalCommission: { $sum: '$commissionAmount' },
        totalEarnings: { $sum: '$organizerAmount' },
        payoutCount: { $sum: 1 },
      },
    },
  ];

  const [result] = await Payment.aggregate(pipeline);
  const stats = result || { totalRevenue: 0, totalCommission: 0, totalEarnings: 0, payoutCount: 0 };

  res.json(new ApiResponse(200, {
    ...stats,
    events: events.map(e => ({ _id: e._id, title: e.title })),
  }, 'Organizer earnings fetched'));
};

module.exports = { getProfile, updateProfile, uploadAvatar, getAllUsers, updateUserRole, deleteUser, getOrganizerEarnings };
