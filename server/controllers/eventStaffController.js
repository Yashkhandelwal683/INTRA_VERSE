const EventStaff = require('../models/EventStaff');
const Event = require('../models/Event');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { createNotification } = require('./notificationController');

exports.getEventTeam = async (req, res) => {
  const { eventId } = req.params;

  const event = await Event.findById(eventId).lean();
  if (!event) throw new ApiError(404, 'Event not found');
  if (event.organizer.toString() !== req.user.id && req.user.role !== 'admin') {
    throw new ApiError(403, 'Not authorized');
  }

  const members = await EventStaff.find({ event: eventId, status: { $ne: 'removed' } })
    .populate('user', 'name email avatar')
    .populate('invitedBy', 'name email')
    .sort({ createdAt: -1 })
    .lean();

  res.json(new ApiResponse(200, { members }, 'Team members fetched'));
};

exports.getMyStaffedEvents = async (req, res) => {
  const memberships = await EventStaff.find({ user: req.user.id, status: 'accepted' })
    .populate('event', 'title poster startDate endDate status location')
    .populate('invitedBy', 'name email')
    .sort({ createdAt: -1 })
    .lean();

  res.json(new ApiResponse(200, { memberships }, 'Staffed events fetched'));
};

exports.inviteMember = async (req, res) => {
  const { eventId } = req.params;
  const { email, role } = req.body;

  if (!email || !role) throw new ApiError(400, 'Email and role are required');

  const validRoles = ['co_organizer', 'check_in_staff', 'content_manager', 'viewer'];
  if (!validRoles.includes(role)) {
    throw new ApiError(400, `Invalid role. Must be one of: ${validRoles.join(', ')}`);
  }

  const event = await Event.findById(eventId);
  if (!event) throw new ApiError(404, 'Event not found');
  if (event.organizer.toString() !== req.user.id && req.user.role !== 'admin') {
    throw new ApiError(403, 'Only the event organizer can manage the team');
  }

  const targetUser = await User.findOne({ email: email.toLowerCase() });
  if (!targetUser) throw new ApiError(404, 'No user found with this email');
  if (targetUser._id.toString() === req.user.id) {
    throw new ApiError(400, 'You cannot invite yourself');
  }
  if (targetUser.role === 'admin') {
    throw new ApiError(400, 'Cannot invite admin users');
  }

  const existing = await EventStaff.findOne({ event: eventId, user: targetUser._id });
  if (existing && existing.status !== 'removed') {
    throw new ApiError(409, 'This user is already a team member');
  }

  if (existing && existing.status === 'removed') {
    existing.status = 'pending';
    existing.role = role;
    existing.invitedBy = req.user.id;
    existing.invitedAt = new Date();
    existing.acceptedAt = undefined;
    existing.removedAt = undefined;
    await existing.save();

    const io = req.app.get('io');
    await createNotification(
      targetUser._id,
      'new_registration',
      'Team Invitation',
      `You've been invited to join "${event.title}" as a team member`,
      { eventId: event._id },
      io
    );

    return res.json(new ApiResponse(200, { member: existing }, 'Invitation re-sent'));
  }

  const member = await EventStaff.create({
    event: eventId,
    user: targetUser._id,
    role,
    invitedBy: req.user.id,
    status: 'pending',
  });

  const io = req.app.get('io');
  await createNotification(
    targetUser._id,
    'new_registration',
    'Team Invitation',
    `You've been invited to join "${event.title}" as ${role.replace('_', ' ')}`,
    { eventId: event._id },
    io
  );

  res.status(201).json(new ApiResponse(201, { member }, 'Invitation sent'));
};

exports.updateMemberRole = async (req, res) => {
  const { eventId, memberId } = req.params;
  const { role } = req.body;

  const validRoles = ['co_organizer', 'check_in_staff', 'content_manager', 'viewer'];
  if (!validRoles.includes(role)) {
    throw new ApiError(400, `Invalid role. Must be one of: ${validRoles.join(', ')}`);
  }

  const event = await Event.findById(eventId);
  if (!event) throw new ApiError(404, 'Event not found');
  if (event.organizer.toString() !== req.user.id && req.user.role !== 'admin') {
    throw new ApiError(403, 'Only the event organizer can manage the team');
  }

  const member = await EventStaff.findOne({ _id: memberId, event: eventId, status: { $ne: 'removed' } });
  if (!member) throw new ApiError(404, 'Team member not found');

  member.role = role;
  await member.save();

  const io = req.app.get('io');
  await createNotification(
    member.user,
    'event_update',
    'Role Updated',
    `Your role in "${event.title}" has been updated to ${role.replace('_', ' ')}`,
    { eventId: event._id },
    io
  );

  res.json(new ApiResponse(200, { member }, 'Role updated'));
};

exports.removeMember = async (req, res) => {
  const { eventId, memberId } = req.params;

  const event = await Event.findById(eventId);
  if (!event) throw new ApiError(404, 'Event not found');
  if (event.organizer.toString() !== req.user.id && req.user.role !== 'admin') {
    throw new ApiError(403, 'Only the event organizer can manage the team');
  }

  const member = await EventStaff.findOne({ _id: memberId, event: eventId });
  if (!member) throw new ApiError(404, 'Team member not found');

  member.status = 'removed';
  member.removedAt = new Date();
  await member.save();

  const io = req.app.get('io');
  await createNotification(
    member.user,
    'event_update',
    'Removed from Team',
    `You've been removed from the team for "${event.title}"`,
    { eventId: event._id },
    io
  );

  res.json(new ApiResponse(200, null, 'Member removed'));
};

exports.acceptInvite = async (req, res) => {
  const { memberId } = req.params;

  const member = await EventStaff.findOne({ _id: memberId, user: req.user.id, status: 'pending' })
    .populate('event', 'title');

  if (!member) throw new ApiError(404, 'Invitation not found');

  member.status = 'accepted';
  member.acceptedAt = new Date();
  await member.save();

  res.json(new ApiResponse(200, { member }, 'Invitation accepted'));
};

exports.declineInvite = async (req, res) => {
  const { memberId } = req.params;

  const member = await EventStaff.findOne({ _id: memberId, user: req.user.id, status: 'pending' });
  if (!member) throw new ApiError(404, 'Invitation not found');

  member.status = 'declined';
  await member.save();

  res.json(new ApiResponse(200, null, 'Invitation declined'));
};

exports.getTeamStats = async (req, res) => {
  const { eventId } = req.params;

  const event = await Event.findById(eventId).lean();
  if (!event) throw new ApiError(404, 'Event not found');
  if (event.organizer.toString() !== req.user.id && req.user.role !== 'admin') {
    throw new ApiError(403, 'Not authorized');
  }

  const [total, byRole, byStatus] = await Promise.all([
    EventStaff.countDocuments({ event: eventId, status: { $ne: 'removed' } }),
    EventStaff.aggregate([
      { $match: { event: event._id, status: { $ne: 'removed' } } },
      { $group: { _id: '$role', count: { $sum: 1 } } },
    ]),
    EventStaff.aggregate([
      { $match: { event: event._id, status: { $ne: 'removed' } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
  ]);

  const roleMap = {};
  byRole.forEach((r) => { roleMap[r._id] = r.count; });

  const statusMap = {};
  byStatus.forEach((s) => { statusMap[s._id] = s.count; });

  res.json(new ApiResponse(200, {
    total,
    byRole: roleMap,
    byStatus: statusMap,
    pending: statusMap.pending || 0,
    accepted: statusMap.accepted || 0,
  }, 'Team stats fetched'));
};
