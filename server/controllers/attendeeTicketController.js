const Registration = require('../models/Registration');
const IssuedTicket = require('../models/IssuedTicket');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

// ── GET /api/attendee/tickets ────────────────────────────────────────────
const getMyTickets = async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const filter = { attendee: req.user.id };

  if (status === 'upcoming') filter.ticketStatus = { $in: ['pending_approval', 'approved'] };
  else if (status === 'past') filter.ticketStatus = { $in: ['approved', 'rejected'] };
  else if (status === 'cancelled') filter.ticketStatus = 'cancelled';
  else if (status) filter.ticketStatus = status;

  const [registrations, total] = await Promise.all([
    Registration.find(filter)
      .populate('event', 'title startDate endDate venue bannerImage category price status')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Registration.countDocuments(filter),
  ]);

  const registrationIds = registrations.map((r) => r._id);
  const issuedTickets = await IssuedTicket.find({
    $or: [
      { registration: { $in: registrationIds } },
      { user: req.user.id },
    ],
  }).lean();

  const ticketMap = {};
  for (const t of issuedTickets) {
    ticketMap[t.registration?.toString()] = t;
    ticketMap[t.user?.toString()] = t;
  }

  const enriched = registrations.map((r) => ({
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
    issuedTicket: ticketMap[r._id.toString()] || null,
  }));

  res.json(new ApiResponse(200, {
    tickets: enriched,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    },
  }, 'Your tickets fetched'));
};

// ── GET /api/attendee/tickets/:id ────────────────────────────────────────
const getTicketById = async (req, res) => {
  const registration = await Registration.findById(req.params.id)
    .populate('event', 'title startDate endDate venue bannerImage category description price status organizer')
    .populate('attendee', 'name email avatar phone')
    .lean();

  if (!registration) throw new ApiError(404, 'Registration not found');
  if (registration.attendee._id.toString() !== req.user.id && req.user.role !== 'admin') {
    throw new ApiError(403, 'Not authorized');
  }

  const issuedTicket = await IssuedTicket.findOne({
    $or: [
      { registration: registration._id },
      { user: req.user.id, event: registration.event?._id },
    ],
  }).lean();

  res.json(new ApiResponse(200, {
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
    issuedTicket: issuedTicket || null,
  }, 'Ticket details fetched'));
};

module.exports = {
  getMyTickets,
  getTicketById,
};
