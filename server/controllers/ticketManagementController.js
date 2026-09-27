const Registration = require('../models/Registration');
const IssuedTicket = require('../models/IssuedTicket');
const Event = require('../models/Event');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { generateTicket } = require('../services/qrService');
const { createNotification } = require('./notificationController');

// ── GET /api/ticket-management/registrations ─────────────────────────────
// Organizer: get all registrations for their events
const getOrganizerRegistrations = async (req, res) => {
  const { page = 1, limit = 20, status, eventId } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const filter = { organizer: req.user.id };

  if (status === 'pending_approval') {
    filter.$or = [
      { ticketStatus: 'pending_approval' },
      { ticketStatus: { $exists: false } },
    ];
  } else if (status) {
    filter.ticketStatus = status;
  }
  if (eventId) filter.event = eventId;

  const [registrations, total] = await Promise.all([
    Registration.find(filter)
      .populate('event', 'title startDate endDate venue bannerImage category price')
      .populate('attendee', 'name email avatar phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Registration.countDocuments(filter),
  ]);

  const normalized = registrations.map((r) => ({
    ...r,
    ticketStatus: r.ticketStatus || 'pending_approval',
    attendeeDetails: r.attendeeDetails || {
      fullName: r.members?.[0]?.name || r.attendee?.name || '',
      email: r.members?.[0]?.email || r.attendee?.email || '',
      phone: r.members?.[0]?.phone || r.attendee?.phone || '',
    },
    quantity: r.quantity || r.members?.length || 1,
    grandTotal: r.grandTotal || r.amountPaid || r.amount || 0,
    paymentStatus: r.paymentStatus || 'pending',
  }));

  res.json(new ApiResponse(200, {
    registrations: normalized,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    },
  }, 'Organizer registrations fetched'));
};

// ── GET /api/ticket-management/registrations/:id ─────────────────────────
const getRegistrationById = async (req, res) => {
  const registration = await Registration.findById(req.params.id)
    .populate('event', 'title startDate endDate venue bannerImage category description price status organizer')
    .populate('attendee', 'name email avatar phone')
    .lean();

  if (!registration) throw new ApiError(404, 'Registration not found');

  if (
    registration.organizer.toString() !== req.user.id &&
    req.user.role !== 'admin'
  ) {
    throw new ApiError(403, 'Not authorized');
  }

  const normalized = {
    ...registration,
    ticketStatus: registration.ticketStatus || 'pending_approval',
    attendeeDetails: registration.attendeeDetails || {
      fullName: registration.members?.[0]?.name || registration.attendee?.name || '',
      email: registration.members?.[0]?.email || registration.attendee?.email || '',
      phone: registration.members?.[0]?.phone || registration.attendee?.phone || '',
    },
    quantity: registration.quantity || registration.members?.length || 1,
    grandTotal: registration.grandTotal || registration.amountPaid || registration.amount || 0,
    paymentStatus: registration.paymentStatus || 'pending',
  };

  res.json(new ApiResponse(200, normalized, 'Registration details fetched'));
};

// ── PATCH /api/ticket-management/registrations/:id/approve ───────────────
const approveTicket = async (req, res) => {
  const registration = await Registration.findById(req.params.id)
    .populate('event', 'title startDate endDate venue bannerImage category price organizer')
    .populate('attendee', 'name email phone avatar');

  if (!registration) throw new ApiError(404, 'Registration not found');

  if (
    registration.organizer.toString() !== req.user.id &&
    req.user.role !== 'admin'
  ) {
    throw new ApiError(403, 'Not authorized to approve this ticket');
  }

  const currentStatus = registration.ticketStatus || 'pending_approval';
  if (currentStatus !== 'pending_approval') {
    throw new ApiError(400, `Ticket is already ${registration.ticketStatus}`);
  }

  const regPaymentStatus = registration.paymentStatus || 'pending';
  const isForceApprove = req.body.force === true || req.body.force === 'true';
  if (regPaymentStatus !== 'paid' && !isForceApprove) {
    throw new ApiError(409, `Cannot approve: payment status is "${regPaymentStatus}". Attendee must complete payment first, or use force approval.`);
  }
  if (regPaymentStatus !== 'paid' && isForceApprove && req.user.role !== 'admin') {
    throw new ApiError(403, 'Only administrators can force-approve a registration with unpaid payment');
  }

  if (!registration.event) throw new ApiError(404, 'Associated event not found');

  const event = registration.event;
  const attendee = registration.attendee;

  if (!attendee) throw new ApiError(404, 'Attendee user not found');

  const { ticketCode, qrToken, qrImage } = await generateTicket(
    {
      eventId: event._id.toString(),
      userId: attendee._id.toString(),
      tierName: 'General',
    },
    event
  );

  await IssuedTicket.create({
    registration: registration._id,
    event: event._id,
    user: attendee._id,
    ticketCode,
    qrToken,
    qrImage,
    tierName: 'General',
    paymentStatus: 'completed',
    attendeeInfo: {
      name: registration.attendeeDetails?.fullName || attendee.name,
      email: registration.attendeeDetails?.email || attendee.email,
      phone: registration.attendeeDetails?.phone || attendee.phone,
    },
  });

  registration.ticketStatus = 'approved';
  registration.ticket = {
    ticketCode,
    qrToken,
    qrImage,
    ticketId: ticketCode,
  };
  await registration.save({ validateBeforeSave: false });

  const io = req.app.get('io');
  if (io) {
    io.to(`user:${attendee._id}`).emit('ticket:approved', {
      registrationId: registration._id,
      eventId: event._id,
      ticketCode,
    });

    await createNotification(
      attendee._id,
      'ticket_checked_in',
      'Ticket Approved',
      `Your ticket for "${event.title}" has been approved. Ticket code: ${ticketCode}`,
      { eventId: event._id, registrationId: registration._id },
      io
    );
  }

  res.json(new ApiResponse(200, {
    registration,
    ticket: { ticketCode, qrImage },
  }, 'Ticket approved successfully'));
};

// ── PATCH /api/ticket-management/registrations/:id/reject ────────────────
const rejectTicket = async (req, res) => {
  const { reason } = req.body;

  const registration = await Registration.findById(req.params.id)
    .populate('attendee', 'name email');

  if (!registration) throw new ApiError(404, 'Registration not found');

  if (
    registration.organizer.toString() !== req.user.id &&
    req.user.role !== 'admin'
  ) {
    throw new ApiError(403, 'Not authorized to reject this ticket');
  }

  const currentStatus = registration.ticketStatus || 'pending_approval';
  if (currentStatus !== 'pending_approval') {
    throw new ApiError(400, `Ticket is already ${registration.ticketStatus}`);
  }

  registration.ticketStatus = 'rejected';
  await registration.save({ validateBeforeSave: false });

  const io = req.app.get('io');
  if (io) {
    io.to(`user:${registration.attendee?._id || registration.attendee}`).emit('ticket:rejected', {
      registrationId: registration._id,
      reason: reason || 'No reason provided',
    });

    const attendeeId = registration.attendee?._id || registration.attendee;
    if (attendeeId) {
      await createNotification(
        attendeeId,
        'cancellation',
        'Ticket Rejected',
        `Your ticket registration has been rejected. Reason: ${reason || 'No reason provided'}`,
        { registrationId: registration._id },
        io
      );
    }
  }

  res.json(new ApiResponse(200, { registration }, 'Ticket rejected'));
};

module.exports = {
  getOrganizerRegistrations,
  getRegistrationById,
  approveTicket,
  rejectTicket,
};
