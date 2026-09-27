const Registration = require('../models/Registration');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

// ── GET /api/admin/ticket-requests ───────────────────────────────────────
const getTicketRequests = async (req, res) => {
  const { page = 1, limit = 20, status, eventId } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const filter = {};
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
      .populate('organizer', 'name email')
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
  }, 'Ticket requests fetched'));
};

// ── GET /api/admin/ticket-requests/stats ─────────────────────────────────
const getTicketRequestStats = async (req, res) => {
  const [pending, approved, rejected, total] = await Promise.all([
    Registration.countDocuments({
      $or: [
        { ticketStatus: 'pending_approval' },
        { ticketStatus: { $exists: false } },
      ],
    }),
    Registration.countDocuments({ ticketStatus: 'approved' }),
    Registration.countDocuments({ ticketStatus: 'rejected' }),
    Registration.countDocuments({}),
  ]);

  res.json(new ApiResponse(200, {
    pending,
    approved,
    rejected,
    total,
  }, 'Ticket request stats'));
};

module.exports = {
  getTicketRequests,
  getTicketRequestStats,
};
