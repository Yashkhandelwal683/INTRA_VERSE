const crypto = require('crypto');
const mongoose = require('mongoose');
const Razorpay = require('razorpay');
const Payment = require('../models/Payment');
const Registration = require('../models/Registration');
const Booking = require('../models/Booking');
const Ticket = require('../models/Ticket');
const IssuedTicket = require('../models/IssuedTicket');
const Event = require('../models/Event');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { createNotification } = require('./notificationController');

const getRazorpay = () =>
  new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: (process.env.RAZORPAY_KEY_SECRET || '').trim(),
  });

const rollbackBooking = async (bookingId, ticketLines) => {
  try {
    for (const { ticket, quantity } of ticketLines) {
      await Ticket.findByIdAndUpdate(ticket, { $inc: { soldQuantity: -quantity } });
    }
    const totalQty = ticketLines.reduce((s, l) => s + l.quantity, 0);
    const booking = await Booking.findById(bookingId);
    if (booking) {
      await Event.findByIdAndUpdate(booking.event, { $inc: { soldCount: -totalQty } });
      booking.status = 'cancelled';
      await booking.save();
    }
  } catch (rbErr) {
    console.error('Rollback error (manual intervention may be needed):', rbErr.message);
  }
};

// ── Existing: Razorpay order creation ─────────────────────────────────────
const createOrder = async (req, res) => {
  const { eventId, tickets: ticketLines, attendee } = req.body;

  if (!eventId) throw new ApiError(400, 'eventId is required');
  if (!ticketLines || ticketLines.length === 0)
    throw new ApiError(400, 'At least one ticket must be selected');

  const session = await mongoose.startSession();
  session.startTransaction();

  let booking;
  let totalAmount = 0;
  let savedTicketLines = [];

  try {
    const event = await Event.findById(eventId).session(session);
    if (!event) throw new ApiError(404, 'Event not found');
    if (event.status !== 'published') throw new ApiError(400, 'Event is not open for booking');

    let totalQtyBooked = 0;

    for (const { ticketId, quantity } of ticketLines) {
      if (!ticketId || !quantity || quantity < 1)
        throw new ApiError(400, 'Each ticket entry needs a valid ticketId and quantity >= 1');

      const ticket = await Ticket.findById(ticketId).session(session);
      if (!ticket) throw new ApiError(404, 'Ticket not found');
      if (!ticket.isActive) throw new ApiError(400, 'Ticket is no longer available');

      const remaining = ticket.totalQuantity - ticket.soldQuantity;
      if (quantity > remaining)
        throw new ApiError(400, `Only ${remaining} ticket(s) left`);
      if (quantity > ticket.perUserLimit)
        throw new ApiError(400, `Max ${ticket.perUserLimit} per person`);

      await Ticket.findByIdAndUpdate(
        ticketId,
        { $inc: { soldQuantity: quantity } },
        { session }
      );

      savedTicketLines.push({ ticket: ticket._id, name: ticket.name, quantity, unitPrice: ticket.price });
      totalAmount += ticket.price * quantity;
      totalQtyBooked += quantity;
    }

    await Event.findByIdAndUpdate(
      eventId,
      { $inc: { soldCount: totalQtyBooked } },
      { session }
    );

    const attendeeInfo = {
      name: (attendee?.attendeeName || attendee?.name || '').trim(),
      email: (attendee?.attendeeEmail || attendee?.email || '').trim().toLowerCase(),
      phone: (attendee?.attendeePhone || attendee?.phone || '').trim(),
    };

    const [created] = await Booking.create(
      [{ user: req.user.id, event: eventId, organizer: event.organizer, tickets: savedTicketLines, totalAmount,
         status: 'pending', attendeeInfo }],
      { session }
    );
    booking = created;

    await session.commitTransaction();
    session.endSession();

    const io = req.app.get('io');
    if (io) {
      for (const line of savedTicketLines) {
        const ticket = await Ticket.findById(line.ticket).lean();
        io.to(`event:${eventId}`).emit('ticketUpdate', {
          eventId,
          ticketTypeId: line.ticket,
          soldQuantity: ticket.soldQuantity,
        });
      }
    }
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }

  try {
    const { sendBookingConfirmation } = require('../services/emailService');
    const [userDoc, eventDoc] = await Promise.all([
      User.findById(req.user.id).lean(),
      Event.findById(eventId).lean(),
    ]);
    await sendBookingConfirmation({
      to: booking.attendeeInfo?.email || userDoc?.email || '',
      attendeeName: booking.attendeeInfo?.name || userDoc?.name || 'Guest',
      bookingRef: booking.bookingRef,
      eventTitle: eventDoc?.title || 'Event',
      eventDate: eventDoc?.startDate ? new Date(eventDoc.startDate).toDateString() : 'TBD',
      venueName: eventDoc?.venue?.name || 'TBD',
      totalAmount,
      eventId,
    });
  } catch (e) {
    console.error('Post-booking side-effect error (booking saved OK):', e.message);
  }

  if (totalAmount === 0) {
    booking.status = 'confirmed';
    await booking.save();

    setImmediate(async () => {
      try {
        const { generateTicket } = require('../services/qrService');
        const [userDoc, eventDoc] = await Promise.all([
          User.findById(req.user.id).lean(),
          Event.findById(eventId).lean(),
        ]);
        if (!userDoc || !eventDoc) return;

        const tierName = savedTicketLines[0]?.name || 'General';
        const { ticketCode, qrToken, qrImage } = await generateTicket(
          { eventId, userId: req.user.id, tierName },
          eventDoc
        );

        await IssuedTicket.create({
          booking: booking._id, event: eventId, user: req.user.id,
          ticketCode, qrToken, qrImage, tierName, paymentStatus: 'completed',
        });

        await Booking.findByIdAndUpdate(booking._id, { qrCode: qrImage });

        const { sendBookingConfirmation } = require('../services/emailService');
        await sendBookingConfirmation({
          user: { name: userDoc.name, email: userDoc.email },
          event: eventDoc,
          ticket: { tierName, ticketCode },
          totalAmount: 0,
          qrImage,
        });
      } catch (e) {
        console.error('Free booking QR error:', e.message);
      }
    });

    return res.status(201).json(
      new ApiResponse(201, {
        isFree: true,
        bookingId: booking._id,
        bookingRef: booking.bookingRef,
        amount: 0,
      }, 'Free booking confirmed')
    );
  }

  let razorpayOrder;
  const amountPaise = Math.round(totalAmount * 100);
  if (amountPaise < 100)
    throw new ApiError(400, 'Minimum payment amount is ₹1');
  try {
    const rz = getRazorpay();
    razorpayOrder = await rz.orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt: booking.bookingRef,
      notes: { bookingId: booking._id.toString(), userId: req.user.id },
    });
  } catch (rzErr) {
    console.error('Razorpay order creation failed:', rzErr.message || rzErr);
    await rollbackBooking(booking._id, savedTicketLines);
    throw new ApiError(502, 'Payment gateway error — please try again shortly');
  }

  const payment = await Payment.create({
    booking: booking._id,
    user: req.user.id,
    razorpayOrderId: razorpayOrder.id,
    amount: totalAmount,
    currency: 'INR',
    status: 'pending',
  });

  booking.paymentId = payment._id;
  await booking.save();

  return res.status(201).json(
    new ApiResponse(201, {
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      bookingId: booking._id,
      bookingRef: booking.bookingRef,
      paymentId: payment._id,
    }, 'Razorpay order created')
  );
};

// ── Existing: Verify Razorpay payment ─────────────────────────────────────
const verifyPayment = async (req, res) => {
  const razorpayOrderId = req.body.razorpay_order_id || req.body.razorpayOrderId;
  const razorpayPaymentId = req.body.razorpay_payment_id || req.body.razorpayPaymentId;
  const razorpaySignature = req.body.razorpay_signature || req.body.razorpaySignature;
  const { bookingId } = req.body;

  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !bookingId)
    throw new ApiError(400, 'Missing required payment verification fields');

  const expectedSig = crypto
    .createHmac('sha256', (process.env.RAZORPAY_KEY_SECRET || '').trim())
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');

  if (expectedSig !== razorpaySignature)
    throw new ApiError(400, 'Payment signature verification failed');

  const booking = await Booking.findById(bookingId).populate('event', 'organizer');
  if (!booking) throw new ApiError(404, 'Booking not found');

  const commissionRate = 10;
  const commissionAmount = Math.round(booking.totalAmount * commissionRate / 100);
  const organizerAmount = booking.totalAmount - commissionAmount;

  const payment = await Payment.findOneAndUpdate(
    { razorpayOrderId },
    {
      razorpayPaymentId,
      razorpaySignature,
      status: 'completed',
      commissionRate,
      commissionAmount,
      organizerAmount,
      organizer: booking.event?.organizer || null,
    },
    { new: true }
  );
  if (!payment) throw new ApiError(404, 'Payment record not found');

  booking.status = 'confirmed';
  await booking.save();

  await booking.populate('tickets.ticket', 'name soldQuantity totalQuantity');

  const io = req.app.get('io');
  if (io) {
    for (const line of booking.tickets) {
      const ticket = line.ticket || {};
      io.to(`event:${booking.event._id || booking.event}`).emit('ticketUpdate', {
        eventId: booking.event._id || booking.event,
        ticketTypeId: ticket._id || line.ticket,
        soldQuantity: ticket.soldQuantity,
      });
    }
    io.to(`user:${booking.user}`).emit('payment:confirmed', {
      bookingId: booking._id,
      amount: booking.totalAmount,
    });

    // Persistent notification to user
    await createNotification(
      booking.user,
      'new_booking',
      'Payment Confirmed',
      `Payment of ₹${booking.totalAmount.toLocaleString('en-IN')} confirmed for your booking`,
      { bookingId: booking._id, eventId: booking.event?._id || booking.event },
      io
    );

    // Persistent notification to organizer
    const eventDoc = await Event.findById(booking.event?._id || booking.event).select('organizer title').lean();
    if (eventDoc?.organizer) {
      await createNotification(
        eventDoc.organizer,
        'new_booking',
        'New Payment Received',
        `Payment of ₹${booking.totalAmount.toLocaleString('en-IN')} received for "${eventDoc.title}"`,
        { bookingId: booking._id, eventId: booking.event?._id || booking.event },
        io
      );
    }
  }

  const tierName = booking.tickets?.[0]?.ticket?.name || 'General';

  setImmediate(async () => {
    try {
      const { generateTicket } = require('../services/qrService');
      const { sendBookingConfirmation } = require('../services/emailService');

      const [userDoc, eventDoc] = await Promise.all([
        User.findById(booking.user).lean(),
        Event.findById(booking.event).lean(),
      ]);

      if (!userDoc || !eventDoc) return;

      const { ticketCode, qrToken, qrImage } = await generateTicket(
        { eventId: booking.event.toString(), userId: booking.user.toString(), tierName },
        eventDoc
      );

      await IssuedTicket.create({
        booking: booking._id,
        event: booking.event,
        user: booking.user,
        ticketCode,
        qrToken,
        qrImage,
        tierName,
        paymentStatus: 'completed',
      });

      await Booking.findByIdAndUpdate(bookingId, { qrCode: qrImage });

      await sendBookingConfirmation({
        user: { name: userDoc.name, email: userDoc.email },
        event: eventDoc,
        ticket: { tierName, ticketCode },
        totalAmount: booking.totalAmount,
        qrImage,
      });
    } catch (e) {
      console.error('QR ticket / email error (payment already confirmed):', e.message);
    }
  });

  res.json(new ApiResponse(200, { payment, booking }, 'Payment verified — booking confirmed'));
};

const getPaymentById = async (req, res) => {
  const payment = await Payment.findById(req.params.id)
    .populate('booking', 'bookingRef status totalAmount')
    .populate('user', 'name email');

  if (!payment) throw new ApiError(404, 'Payment not found');

  if (payment.user._id.toString() !== req.user.id && req.user.role !== 'admin')
    throw new ApiError(403, 'Not authorized to view this payment');

  res.json(new ApiResponse(200, payment, 'Payment details fetched'));
};

module.exports = { createOrder, verifyPayment, getPaymentById };
