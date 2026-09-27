const mongoose  = require('mongoose');
const jwt        = require('jsonwebtoken');
const Ticket     = require('../models/Ticket');
const IssuedTicket = require('../models/IssuedTicket');
const Event      = require('../models/Event');
const ApiError   = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

// ── POST /api/tickets ──────────────────────────────────────────────────────────
const createTicket = async (req, res) => {
  const { event: eventId } = req.body;

  const event = await Event.findById(eventId);
  if (!event) throw new ApiError(404, 'Event not found');

  // Only the event organizer or admin may add tickets
  if (
    event.organizer.toString() !== req.user.id &&
    req.user.role !== 'admin'
  ) {
    throw new ApiError(403, 'Only the event organizer can add tickets');
  }

  const ticket = await Ticket.create(req.body);
  res.status(201).json(new ApiResponse(201, ticket, 'Ticket created successfully'));
};

// ── GET /api/tickets/event/:eventId ────────────────────────────────────────────
const getTicketsByEvent = async (req, res) => {
  const tickets = await Ticket.find({ event: req.params.eventId })
    .sort({ price: 1 })
    .lean();

  res.json(new ApiResponse(200, tickets, 'Tickets fetched successfully'));
};

// ── PATCH /api/tickets/:id ─────────────────────────────────────────────────────
const updateTicket = async (req, res) => {
  const ticket = await Ticket.findById(req.params.id).populate('event');
  if (!ticket) throw new ApiError(404, 'Ticket not found');

  if (
    ticket.event.organizer.toString() !== req.user.id &&
    req.user.role !== 'admin'
  ) {
    throw new ApiError(403, 'Only the event organizer can update tickets');
  }

  // Prevent decreasing totalQuantity below soldQuantity
  if (
    req.body.totalQuantity !== undefined &&
    Number(req.body.totalQuantity) < ticket.soldQuantity
  ) {
    throw new ApiError(
      400,
      `Cannot set totalQuantity (${req.body.totalQuantity}) below already sold quantity (${ticket.soldQuantity})`
    );
  }

  const updated = await Ticket.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.json(new ApiResponse(200, updated, 'Ticket updated successfully'));
};

// ── DELETE /api/tickets/:id ────────────────────────────────────────────────────
const deleteTicket = async (req, res) => {
  const ticket = await Ticket.findById(req.params.id).populate('event');
  if (!ticket) throw new ApiError(404, 'Ticket not found');

  if (
    ticket.event.organizer.toString() !== req.user.id &&
    req.user.role !== 'admin'
  ) {
    throw new ApiError(403, 'Only the event organizer can delete tickets');
  }

  if (ticket.soldQuantity > 0) {
    throw new ApiError(400, `Cannot delete a ticket that has ${ticket.soldQuantity} sold units`);
  }

  await ticket.deleteOne();
  res.json(new ApiResponse(200, null, 'Ticket deleted successfully'));
};

// ── POST /api/tickets/validate ─────────────────────────────────────────────────
/**
 * Validates a QR token at the venue gate.
 * Organizers and admins only.
 * Uses MongoDB transaction to prevent concurrent double-entry race conditions.
 */
const validateTicket = async (req, res) => {
  const { qrToken } = req.body;
  const scannerId   = req.user.id;
  const scannerIp   = req.ip || req.connection?.remoteAddress || 'unknown';

  if (!qrToken) throw new ApiError(400, 'QR token is required');

  // ── Step 1: Verify JWT signature + expiry ─────────────────────────────────
  let decoded;
  try {
    decoded = jwt.verify(qrToken, process.env.QR_SECRET);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(400).json(
        new ApiResponse(400, { result: 'expired' }, 'Ticket QR has expired — event has ended')
      );
    }
    return res.status(400).json(
      new ApiResponse(400, { result: 'invalid' }, 'Invalid QR code — token is tampered or unrecognised')
    );
  }

  // ── Step 2: Atomic MongoDB transaction ────────────────────────────────────
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // findOneAndUpdate with isUsed:false as a condition prevents double-entry atomically.
    // If isUsed is already true, findOneAndUpdate returns null → we handle below.
    const ticket = await IssuedTicket.findOneAndUpdate(
      {
        ticketCode:    decoded.tc,
        isUsed:        false,
        paymentStatus: 'completed',
      },
      {
        $set:  { isUsed: true, usedAt: new Date(), usedBy: scannerId },
        $inc:  { scanAttempts: 1 },
        $push: {
          scanLog: {
            scannedAt: new Date(),
            scannedBy: scannerId,
            ipAddress: scannerIp,
            result:    'valid',
          },
        },
      },
      { new: true, session }
    )
      .populate('event',   'title startDate venue')
      .populate('user',    'name email')
      .populate('booking', 'bookingRef status cancellationStatus refundStatus');

    if (ticket) {
      // ── CHECK FOR CANCELLED BOOKING ─────────────────────────────────────────
      if (ticket.booking?.status === 'cancelled') {
        // Rollback the isUsed since we won't actually admit them
        await IssuedTicket.findByIdAndUpdate(ticket._id, { 
          $set: { isUsed: false }, 
          usedAt: null, 
          usedBy: null,
          $push: {
            scanLog: {
              scannedAt: new Date(),
              scannedBy: scannerId,
              ipAddress: scannerIp,
              result:    'cancelled',
            },
          },
        }, { session });

        await session.commitTransaction();
        session.endSession();

        return res.status(400).json(
          new ApiResponse(400, { 
            result: 'cancelled',
            bookingRef: ticket.booking?.bookingRef,
            refundStatus: ticket.booking?.refundStatus,
            cancellationStatus: ticket.booking?.cancellationStatus
          }, '🚫 Ticket Cancelled — This booking was cancelled or refunded and cannot be used for entry.')
        );
      }

      // ✅ SUCCESS — entry granted
      await session.commitTransaction();
      session.endSession();

      return res.status(200).json(
        new ApiResponse(200, {
          result:      'valid',
          ticketCode:  ticket.ticketCode,
          holderName:  ticket.user?.name,
          holderEmail: ticket.user?.email,
          tierName:    ticket.tierName,
          eventName:   ticket.event?.title,
          venue:       ticket.event?.venue?.name,
          bookingRef:  ticket.booking?.bookingRef,
          usedAt:      ticket.usedAt,
        }, '✅ Valid entry — access granted')
      );
    }

    // ticket not updated → could be already used, unpaid, or not found
    await session.abortTransaction();
    session.endSession();

    // Find out why it failed
    const existing = await IssuedTicket.findOne({ ticketCode: decoded.tc })
      .populate('user',    'name email')
      .populate('booking', 'bookingRef status cancellationStatus refundStatus');

    if (!existing) {
      return res.status(404).json(
        new ApiResponse(404, { result: 'invalid' }, 'Ticket not found in system')
      );
    }

    // ── PRIORITY CHECK: CANCELLED ─────────────────────────────────────────────
    if (existing.booking?.status === 'cancelled') {
        return res.status(400).json(
          new ApiResponse(400, { 
            result: 'cancelled',
            bookingRef: existing.booking?.bookingRef,
            refundStatus: existing.booking?.refundStatus,
            cancellationStatus: existing.booking?.cancellationStatus
          }, '🚫 Ticket Cancelled — This booking is inactive.')
        );
    }

    if (existing.paymentStatus !== 'completed') {
      // Log the unpaid scan attempt
      await IssuedTicket.findByIdAndUpdate(existing._id, {
        $inc:  { scanAttempts: 1 },
        $push: {
          scanLog: {
            scannedAt: new Date(),
            scannedBy: scannerId,
            ipAddress: scannerIp,
            result:    'unpaid',
          },
        },
      });
      return res.status(400).json(
        new ApiResponse(400, { result: 'unpaid' }, 'Payment not completed — entry denied')
      );
    }

    if (existing.isUsed) {
      // Log the duplicate scan
      await IssuedTicket.findByIdAndUpdate(existing._id, {
        $inc:  { scanAttempts: 1 },
        $push: {
          scanLog: {
            scannedAt: new Date(),
            scannedBy: scannerId,
            ipAddress: scannerIp,
            result:    'already_used',
          },
        },
      });
      return res.status(409).json(
        new ApiResponse(409, {
          result:     'already_used',
          usedAt:     existing.usedAt,
          scanCount:  existing.scanAttempts + 1,
          holderName: existing.user?.name,
        }, `🚫 Already used — entry was granted at ${existing.usedAt?.toLocaleString('en-IN') ?? 'unknown time'}`)
      );
    }

    return res.status(400).json(
      new ApiResponse(400, { result: 'invalid' }, 'Ticket validation failed')
    );

  } catch (err) {
    if (session.inTransaction()) await session.abortTransaction();
    session.endSession();
    throw err;
  }
};

// ── GET /api/tickets/fraud-report?eventId=xxx ──────────────────────────────────
/**
 * Returns suspicious scan activity for an event.
 * Admin only.
 */
const getFraudReport = async (req, res) => {
  const { eventId } = req.query;
  if (!eventId) throw new ApiError(400, 'eventId query param is required');

  const [suspicious, summary] = await Promise.all([
    IssuedTicket.find({
      event:        eventId,
      scanAttempts: { $gt: 1 },
    })
      .populate('user',    'name email')
      .populate('booking', 'bookingRef')
      .sort({ scanAttempts: -1 })
      .lean(),

    IssuedTicket.aggregate([
      { $match: { event: new mongoose.Types.ObjectId(eventId) } },
      {
        $group: {
          _id:        null,
          total:      { $sum: 1 },
          used:       { $sum: { $cond: ['$isUsed', 1, 0] } },
          fraudulent: { $sum: { $cond: [{ $gt: ['$scanAttempts', 1] }, 1, 0] } },
          avgScans:   { $avg: '$scanAttempts' },
        },
      },
    ]),
  ]);

  res.json(
    new ApiResponse(200, { summary: summary[0] ?? {}, suspicious }, 'Fraud report fetched')
  );
};

module.exports = {
  createTicket,
  getTicketsByEvent,
  updateTicket,
  deleteTicket,
  validateTicket,
  getFraudReport,
};
