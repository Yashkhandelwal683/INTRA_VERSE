const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Ticket  = require('../models/Ticket');
const IssuedTicket = require('../models/IssuedTicket');
const Event   = require('../models/Event');
const User    = require('../models/User');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { generateQR } = require('../services/qrService');
const { sendBookingConfirmation, sendCancellationRequestToAdmin, sendCancellationApprovedEmail, sendCancellationRejectedEmail } = require('../services/emailService');
const { createNotification } = require('./notificationController');
const { invalidatePattern } = require('../config/redis');

// ── POST /api/bookings ────────────────────────────────────────────────────────
/**
 * Atomically:
 *  1. Validate per-user limit and stock for every ticket line
 *  2. Decrement soldQuantity on Ticket docs + increment soldCount on Event
 *  3. Create Booking with status:'pending'
 *  4. Generate QR code and persist it
 *  5. Send confirmation email
 *  6. Emit 'ticketUpdate' via Socket.IO
 */
const createBooking = async (req, res) => {
  const { eventId, tickets: ticketLines, attendeeInfo } = req.body;

  if (!ticketLines || ticketLines.length === 0) {
    throw new ApiError(400, 'At least one ticket must be selected');
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // ── Validate event ───────────────────────────────────────────────────────
    const event = await Event.findById(eventId).session(session);
    if (!event) throw new ApiError(404, 'Event not found');
    if (event.status !== 'published') throw new ApiError(400, 'Event is not available for booking');

    const bookingTicketLines = [];
    let totalAmount = 0;
    let totalQtyBooked = 0;

    for (const { ticketId, quantity } of ticketLines) {
      const ticket = await Ticket.findById(ticketId).session(session);
      if (!ticket) throw new ApiError(404, `Ticket ${ticketId} not found`);
      if (!ticket.isActive) throw new ApiError(400, `Ticket "${ticket.name}" is no longer active`);

      const now = new Date();
      if (ticket.saleStartDate && now < ticket.saleStartDate)
        throw new ApiError(400, `Ticket "${ticket.name}" sale has not started yet`);
      if (ticket.saleEndDate && now > ticket.saleEndDate)
        throw new ApiError(400, `Ticket "${ticket.name}" sale has ended`);

      const remaining = ticket.totalQuantity - ticket.soldQuantity;
      if (quantity > remaining)
        throw new ApiError(400, `Only ${remaining} "${ticket.name}" tickets remaining`);

      if (quantity > ticket.perUserLimit)
        throw new ApiError(400, `Maximum ${ticket.perUserLimit} "${ticket.name}" tickets per user`);

      // Atomic decrement
      await Ticket.findByIdAndUpdate(
        ticketId,
        { $inc: { soldQuantity: quantity } },
        { session }
      );

      bookingTicketLines.push({
        ticket: ticket._id,
        quantity,
        unitPrice: ticket.price,
      });

      totalAmount += ticket.price * quantity;
      totalQtyBooked += quantity;
    }

    // Increment event soldCount
    await Event.findByIdAndUpdate(
      eventId,
      { $inc: { soldCount: totalQtyBooked } },
      { session }
    );

    // ── Create booking ───────────────────────────────────────────────────────
    const [booking] = await Booking.create(
      [
        {
          user: req.user.id,
          event: eventId,
          organizer: event.organizer,
          tickets: bookingTicketLines,
          totalAmount,
          status: 'pending',
          attendeeInfo: attendeeInfo || {},
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    // ── Post-commit: email (non-critical, do not roll back) ──
    try {
      const userDoc = attendeeInfo?.email ? null : await User.findById(req.user.id).lean();
      await sendBookingConfirmation({
        to: attendeeInfo?.email || userDoc?.email || '',
        attendeeName: attendeeInfo?.name || userDoc?.name || 'Guest',
        bookingRef: booking.bookingRef,
        eventTitle: event.title,
        eventDate: event.startDate.toDateString(),
        venueName:    event.venue?.name || '',
        totalAmount,
        eventId:      event._id,
      });
    } catch (emailOrQrErr) {
      console.error('⚠️   Post-booking email/QR error (booking is still saved):', emailOrQrErr.message);
    }

    // ── Socket.IO — emit ticketUpdate for every ticket line ──────────────────
    const io = req.app.get('io');
    if (io) {
      for (const line of bookingTicketLines) {
        const ticket = await Ticket.findById(line.ticket).lean();
        io.to(`event:${eventId}`).emit('ticketUpdate', {
          eventId,
          ticketTypeId: line.ticket,
          soldQuantity: ticket.soldQuantity,
        });
      }
      // Notify event organizer
      io.to(`event:${eventId}`).emit('booking:new', { eventId, bookingId: booking._id });

      // Persistent notification to organizer
      const eventDoc = await Event.findById(eventId).select('organizer title').lean();
      if (eventDoc?.organizer) {
        await createNotification(
          eventDoc.organizer,
          'new_booking',
          'New Booking Received',
          `A new booking for "${eventDoc.title}" — ₹${totalAmount.toLocaleString('en-IN')}`,
          { bookingId: booking._id, eventId },
          io
        );
      }

      // Persistent notification to attendee
      await createNotification(
        req.user.id,
        'new_booking',
        'Booking Confirmed',
        `Your booking for "${event.title}" has been created successfully`,
        { bookingId: booking._id, eventId },
        io
      );
    }

    await invalidatePattern('admin');
    await invalidatePattern('org');
    await invalidatePattern('attendee');

    res.status(201).json(new ApiResponse(201, booking, 'Booking created successfully'));
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
};

// ── GET /api/bookings/my ──────────────────────────────────────────────────────
const getUserBookings = async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const [bookings, total] = await Promise.all([
    Booking.find({ user: req.user.id })
      .populate('event', 'title startDate venue bannerImage status')
      .populate('tickets.ticket', 'name type price')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Booking.countDocuments({ user: req.user.id }),
  ]);

  // Attach issuedTicket (qrImage + ticketCode) to each booking
  const bookingIds = bookings.map((b) => b._id);
  const issuedTickets = await IssuedTicket.find({ booking: { $in: bookingIds } })
    .select('booking ticketCode qrImage tierName isUsed usedAt')
    .lean();

  const issuedMap = {};
  for (const it of issuedTickets) issuedMap[it.booking.toString()] = it;

  const enriched = bookings.map((b) => ({
    ...b,
    issuedTicket: issuedMap[b._id.toString()] ?? null,
  }));

  res.json(
    new ApiResponse(200, {
      bookings: enriched,
      pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
    }, 'Your bookings fetched')
  );
};

// ── GET /api/bookings/:id ─────────────────────────────────────────────────────
const getBookingById = async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate('event', 'title startDate endDate venue bannerImage organizer')
    .populate('tickets.ticket', 'name type price')
    .populate('user', 'name email avatar')
    .lean();

  if (!booking) throw new ApiError(404, 'Booking not found');

  // User can only view their own booking; admin can view any
  if (
    booking.user._id.toString() !== req.user.id &&
    req.user.role !== 'admin'
  ) {
    throw new ApiError(403, 'Not authorized to view this booking');
  }

  // Attach real IssuedTicket (contains JWT-signed qrImage for gate scanning)
  const issuedTicket = await IssuedTicket.findOne({ booking: booking._id })
    .select('ticketCode qrImage tierName isUsed usedAt paymentStatus')
    .lean();

  res.json(new ApiResponse(200, { ...booking, issuedTicket: issuedTicket ?? null }, 'Booking fetched successfully'));
};

// ── PATCH /api/bookings/:id/cancel ───────────────────────────────────────────
const cancelBooking = async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) throw new ApiError(404, 'Booking not found');

  if (booking.user.toString() !== req.user.id && req.user.role !== 'admin')
    throw new ApiError(403, 'Not authorized to cancel this booking');

  if (['cancelled', 'refunded'].includes(booking.status))
    throw new ApiError(400, `Booking is already ${booking.status}`);

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Restore ticket quantities
    for (const line of booking.tickets) {
      await Ticket.findByIdAndUpdate(
        line.ticket,
        { $inc: { soldQuantity: -line.quantity } },
        { session }
      );
    }

    const totalQty = booking.tickets.reduce((s, l) => s + l.quantity, 0);
    await Event.findByIdAndUpdate(booking.event, { $inc: { soldCount: -totalQty } }, { session });

    booking.status = 'cancelled';
    await booking.save({ session });

    await session.commitTransaction();
    session.endSession();

    // Emit ticketUpdate
    const io = req.app.get('io');
    if (io) {
      for (const line of booking.tickets) {
        const ticket = await Ticket.findById(line.ticket).lean();
        if (ticket) {
          io.to(`event:${booking.event}`).emit('ticketUpdate', {
            eventId: booking.event,
            ticketTypeId: line.ticket,
            soldQuantity: ticket.soldQuantity,
          });
        }
      }

      // Persistent notification to user
      await createNotification(
        req.user.id,
        'cancellation',
        'Booking Cancelled',
        `Your booking has been cancelled successfully`,
        { bookingId: booking._id, eventId: booking.event },
        io
      );
    }

    await invalidatePattern('admin');
    await invalidatePattern('org');
    await invalidatePattern('attendee');

    res.json(new ApiResponse(200, booking, 'Booking cancelled successfully'));
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
};

// ── POST /api/bookings/:bookingId/cancel-request ─────────────────────────────
/**
 * User requests cancellation — enforces 48-hour policy and calculates
 * tiered refund. Sends notification email to admin.
 */
const requestCancellation = async (req, res) => {
  const { bookingId }          = req.params;
  const { cancellationReason } = req.body;

  const booking = await Booking.findById(bookingId)
    .populate('event', 'title startDate venue')
    .populate('user',  'name email');

  if (!booking) throw new ApiError(404, 'Booking not found');
  if (booking.user._id.toString() !== req.user.id) throw new ApiError(403, 'Not authorized');
  if (booking.status !== 'confirmed') throw new ApiError(400, 'Only confirmed bookings can be cancelled');
  if (booking.cancellationStatus === 'requested') throw new ApiError(400, 'Cancellation already requested');

  // Check 48-hour policy
  const hoursUntilEvent = (new Date(booking.event.startDate) - new Date()) / (1000 * 60 * 60);
  if (hoursUntilEvent < 48) {
    throw new ApiError(400, 'Cancellation not allowed within 48 hours of event');
  }

  // Calculate refund amount based on policy
  let refundPercent = 100;
  if (hoursUntilEvent < 168) refundPercent = 75;
  if (hoursUntilEvent < 72)  refundPercent = 50;
  const refundAmount = (booking.totalAmount * refundPercent) / 100;

  // Update booking status
  booking.cancellationStatus      = 'requested';
  booking.cancellationRequestedAt = new Date();
  booking.cancellationReason      = cancellationReason || 'No reason provided';
  booking.refundAmount            = refundAmount;
  booking.refundPercent           = refundPercent;
  await booking.save();

  // Send email to ADMIN (non-critical)
  try {
    await sendCancellationRequestToAdmin({
      booking,
      user:         booking.user,
      event:        booking.event,
      refundAmount,
      refundPercent,
      hoursUntilEvent: Math.floor(hoursUntilEvent),
    });
  } catch (emailErr) {
    console.error('⚠️  Failed to send cancellation request email to admin:', emailErr.message);
  }

  // Socket.IO — notify admins
  const io = req.app.get('io');
  if (io) {
    io.to('admin').emit('cancellation:request', {
      bookingId: booking._id,
      eventId: booking.event._id,
      userId: req.user.id,
      reason: cancellationReason,
    });

    // Persistent notification to all admins (find admin users)
    const admins = await User.find({ role: 'admin' }).select('_id').lean();
    for (const admin of admins) {
      await createNotification(
        admin._id,
        'cancellation',
        'Cancellation Requested',
        `${booking.user.name} requested cancellation for "${booking.event.title}" — refund ₹${refundAmount.toLocaleString('en-IN')}`,
        { bookingId: booking._id, eventId: booking.event._id },
        io
      );
    }
  }

  res.json(new ApiResponse(200, booking, 'Cancellation request submitted. Admin will review within 24 hours.'));
};

// ── POST /api/bookings/:bookingId/admin-decision ─────────────────────────────
/**
 * Admin approves or rejects a pending cancellation request.
 * On approval: booking status → cancelled, refundStatus → pending, user emailed.
 * On rejection: cancellationStatus → rejected, user emailed.
 */
const adminApproveCancellation = async (req, res) => {
  const { bookingId }        = req.params;
  const { decision, reason } = req.body; // decision: 'approve' or 'reject'

  if (!['approve', 'reject'].includes(decision)) {
    throw new ApiError(400, 'Decision must be approve or reject');
  }

  const booking = await Booking.findById(bookingId)
    .populate('event', 'title startDate venue')
    .populate('user',  'name email');

  if (!booking) throw new ApiError(404, 'Booking not found');
  if (booking.cancellationStatus !== 'requested') {
    throw new ApiError(400, 'No pending cancellation request for this booking');
  }

  const io = req.app.get('io');

  if (decision === 'approve') {
    booking.status                  = 'cancelled';
    booking.cancellationStatus      = 'approved';
    booking.cancellationApprovedAt  = new Date();
    booking.cancellationApprovedBy  = req.user.id;
    booking.refundStatus            = 'pending';
    booking.refundInitiatedAt       = new Date();
    await booking.save();

    // Send approval email to user with refund details
    try {
      await sendCancellationApprovedEmail({
        user:          booking.user,
        event:         booking.event,
        booking,
        refundAmount:  booking.refundAmount,
        refundPercent: booking.refundPercent,
      });
    } catch (emailErr) {
      console.error('⚠️  Failed to send cancellation approved email:', emailErr.message);
    }

    // Socket.IO — notify user
    if (io) {
      io.to(`user:${booking.user._id}`).emit('cancellation:decision', {
        bookingId: booking._id,
        decision: 'approved',
        refundAmount: booking.refundAmount,
      });

      await createNotification(
        booking.user._id,
        'refund',
        'Cancellation Approved',
        `Your cancellation for "${booking.event.title}" has been approved. Refund: ₹${booking.refundAmount.toLocaleString('en-IN')}`,
        { bookingId: booking._id, eventId: booking.event?._id },
        io
      );
    }
  } else {
    booking.cancellationStatus = 'rejected';
    await booking.save();

    // Send rejection email to user
    try {
      await sendCancellationRejectedEmail({
        user:    booking.user,
        event:   booking.event,
        booking,
        reason:  reason || 'Request reviewed and denied by admin',
      });
    } catch (emailErr) {
      console.error('⚠️  Failed to send cancellation rejected email:', emailErr.message);
    }

    // Socket.IO — notify user
    if (io) {
      io.to(`user:${booking.user._id}`).emit('cancellation:decision', {
        bookingId: booking._id,
        decision: 'rejected',
        reason: reason || 'Request reviewed and denied by admin',
      });

      await createNotification(
        booking.user._id,
        'cancellation',
        'Cancellation Rejected',
        `Your cancellation request for "${booking.event.title}" has been rejected`,
        { bookingId: booking._id, eventId: booking.event?._id },
        io
      );
    }
  }

  // Socket.IO — notify admin room that decision was made
  if (io) {
    io.to('admin').emit('cancellation:resolved', { bookingId: booking._id, decision });
  }

  res.json(new ApiResponse(200, booking,
    decision === 'approve' ? 'Cancellation approved and refund initiated' : 'Cancellation request rejected'
  ));
};

// ── GET /api/bookings/cancellation-requests ──────────────────────────────────
/**
 * Admin-only: fetches all bookings with cancellationStatus === 'requested'.
 */
const getPendingCancellations = async (req, res) => {
  const pending = await Booking.find({ cancellationStatus: 'requested' })
    .populate('user',  'name email avatar')
    .populate('event', 'title startDate venue')
    .sort({ cancellationRequestedAt: -1 });

  res.json(new ApiResponse(200, pending, 'Pending cancellation requests'));
};

module.exports = {
  createBooking,
  getUserBookings,
  getBookingById,
  cancelBooking,
  requestCancellation,
  adminApproveCancellation,
  getPendingCancellations,
};
