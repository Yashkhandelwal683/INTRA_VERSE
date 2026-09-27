const IssuedTicket = require('../models/IssuedTicket');
const Booking = require('../models/Booking');
const Event = require('../models/Event');
const SubEvent = require('../models/SubEvent');
const qrService = require('../services/qrService');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const mongoose = require('mongoose');

exports.generateEventQR = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) throw new ApiError(404, 'Event not found');
    if (event.organizer.toString() !== req.user.id && req.user.role !== 'admin') {
      throw new ApiError(403, 'Not authorized');
    }
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const eventUrl = `${frontendUrl}/events/${event._id}`;
    const qrImage = await qrService.generateQRImage(eventUrl);
    res.json(new ApiResponse(200, { qrImage, eventUrl, eventId: event._id }));
  } catch (err) { next(err); }
};

exports.scanTicket = async (req, res, next) => {
  try {
    const rawToken = req.body.token || req.body.qrToken;
    if (!rawToken) throw new ApiError(400, 'QR token is required');

    const decoded = qrService.verifyQRToken(rawToken);
    if (!decoded) throw new ApiError(400, 'Invalid or expired QR code');

    const ticket = await IssuedTicket.findOne({ ticketCode: decoded.tc })
      .populate('event', 'title bannerImage startDate endDate venue organizer')
      .populate('subEvent', 'title venue')
      .populate('user', 'name email phone avatar');

    if (!ticket) throw new ApiError(404, 'Ticket not found');

    const event = ticket.event;
    if (!event) throw new ApiError(404, 'Event not found');
    if (event.organizer.toString() !== req.user.id) {
      throw new ApiError(403, 'This ticket is for a different organizer\'s event');
    }

    const scanLogEntry = {
      scannedAt: new Date(),
      scannedBy: req.user.id,
      action: 'entry_attempt',
      result: 'valid',
    };

    const attendeeData = ticket.attendeeInfo || {};
    const user = ticket.user || {};

    let status = 'valid';
    let canEnter = false;
    let canExit = false;
    let message = '';

    if (ticket.entryStatus === 'checked_in') {
      status = 'already_checked_in';
      message = 'Already checked in. Scan to exit.';
      canExit = true;
      scanLogEntry.action = 'exit_attempt';
      scanLogEntry.result = 'already_checked_in';
    } else if (ticket.entryStatus === 'checked_out') {
      status = 'checked_out';
      message = 'Already checked out from this event.';
      canExit = false;
      scanLogEntry.result = 'checked_out';
    } else if (ticket.entryStatus === 'cancelled') {
      status = 'invalid';
      message = 'This ticket has been cancelled.';
      scanLogEntry.result = 'invalid';
    } else if (ticket.entryStatus === 'expired') {
      status = 'invalid';
      message = 'This ticket has expired.';
      scanLogEntry.result = 'expired';
    } else if (ticket.paymentStatus !== 'completed') {
      status = 'invalid';
      message = 'Payment not completed for this ticket.';
      scanLogEntry.result = 'unpaid';
    } else {
      canEnter = true;
      message = 'Valid ticket. Allow entry.';
    }

    ticket.scanAttempts += 1;
    ticket.scanLog.push(scanLogEntry);
    await ticket.save();

    const ticketData = ticket.toObject();
    ticketData.attendeeInfo = attendeeData;
    ticketData.user = user;
    ticketData.event = event;

    res.json(new ApiResponse(200, {
      status,
      message,
      canEnter,
      canExit,
      ticket: ticketData,
    }));
  } catch (err) { next(err); }
};

exports.confirmEntry = async (req, res, next) => {
  try {
    const { ticketId } = req.body;
    const ticket = await IssuedTicket.findById(ticketId);
    if (!ticket) throw new ApiError(404, 'Ticket not found');
    if (ticket.entryStatus !== 'unused' && ticket.entryStatus !== 'checked_in') {
      throw new ApiError(400, `Cannot enter: ticket is ${ticket.entryStatus}`);
    }

    const event = await Event.findById(ticket.event);
    if (!event || (event.organizer.toString() !== req.user.id && req.user.role !== 'admin')) {
      throw new ApiError(403, 'Not authorized');
    }

    if (ticket.entryStatus === 'unused') {
      ticket.entryStatus = 'checked_in';
      ticket.entryTime = new Date();
      ticket.checkedInBy = req.user.id;
      ticket.scanLog.push({
        scannedAt: new Date(),
        scannedBy: req.user.id,
        action: 'entry_granted',
        result: 'valid',
      });
    } else if (ticket.entryStatus === 'checked_in') {
      ticket.entryStatus = 'checked_out';
      ticket.exitTime = new Date();
      ticket.checkedOutBy = req.user.id;
      ticket.scanLog.push({
        scannedAt: new Date(),
        scannedBy: req.user.id,
        action: 'exit_granted',
        result: 'checked_out',
      });
    }

    await ticket.save();

    res.json(new ApiResponse(200, {
      entryStatus: ticket.entryStatus,
      entryTime: ticket.entryTime,
      exitTime: ticket.exitTime,
      message: ticket.entryStatus === 'checked_in' ? 'Entry granted' : 'Exit recorded',
    }));
  } catch (err) { next(err); }
};

exports.getAttendeesByEvent = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { search, status, page = 1, limit = 50 } = req.query;

    const event = await Event.findById(eventId);
    if (!event) throw new ApiError(404, 'Event not found');
    if (event.organizer.toString() !== req.user.id && req.user.role !== 'admin') {
      throw new ApiError(403, 'Not authorized');
    }

    const query = { event: eventId };
    if (status) query.entryStatus = status;
    if (search) {
      query.$or = [
        { 'attendeeInfo.name': { $regex: search, $options: 'i' } },
        { 'attendeeInfo.email': { $regex: search, $options: 'i' } },
        { 'attendeeInfo.phone': { $regex: search, $options: 'i' } },
        { ticketCode: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [tickets, total] = await Promise.all([
      IssuedTicket.find(query)
        .populate('user', 'name email phone avatar')
        .populate('subEvent', 'title')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      IssuedTicket.countDocuments(query),
    ]);

    const attendees = tickets.map((t) => ({
      _id: t._id,
      ticketCode: t.ticketCode,
      tierName: t.tierName,
      paymentStatus: t.paymentStatus,
      entryStatus: t.entryStatus,
      entryTime: t.entryTime,
      exitTime: t.exitTime,
      attendeeInfo: t.attendeeInfo,
      user: t.user,
      subEvent: t.subEvent,
      createdAt: t.createdAt,
    }));

    res.json(new ApiResponse(200, {
      attendees,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    }));
  } catch (err) { next(err); }
};

exports.getAttendeesByOrganizer = async (req, res, next) => {
  try {
    const events = await Event.find({ organizer: req.user.id }).select('_id title');
    const eventIds = events.map((e) => e._id);

    const tickets = await IssuedTicket.find({ event: { $in: eventIds } })
      .populate('user', 'name email phone avatar')
      .populate('event', 'title')
      .populate('subEvent', 'title')
      .sort({ createdAt: -1 });

    const grouped = {};
    for (const ticket of tickets) {
      const eventTitle = ticket.event?.title || 'Unknown';
      if (!grouped[eventTitle]) {
        grouped[eventTitle] = { event: ticket.event, subEvents: {} };
      }
      const subTitle = ticket.subEvent?.title || '__main__';
      if (!grouped[eventTitle].subEvents[subTitle]) {
        grouped[eventTitle].subEvents[subTitle] = [];
      }
      grouped[eventTitle].subEvents[subTitle].push(ticket);
    }

    res.json(new ApiResponse(200, { grouped, events }));
  } catch (err) { next(err); }
};

exports.exportAttendees = async (req, res, next) => {
  try {
    const { eventId, format = 'csv' } = req.query;
    const query = {};
    if (eventId) {
      const event = await Event.findById(eventId);
      if (!event) throw new ApiError(404, 'Event not found');
      if (event.organizer.toString() !== req.user.id && req.user.role !== 'admin') {
        throw new ApiError(403, 'Not authorized');
      }
      query.event = eventId;
    } else {
      const events = await Event.find({ organizer: req.user.id }).select('_id');
      query.event = { $in: events.map((e) => e._id) };
    }

    const tickets = await IssuedTicket.find(query)
      .populate('user', 'name email phone')
      .populate('event', 'title')
      .populate('subEvent', 'title')
      .lean();

    if (format === 'csv') {
      const headers = 'Ticket Code,Attendee Name,Phone,Email,Event,Sub Event,Ticket Type,Payment Status,Entry Status,Entry Time,Exit Time\n';
      const rows = tickets.map((t) =>
        [
          t.ticketCode,
          t.attendeeInfo?.name || t.user?.name || '',
          t.attendeeInfo?.phone || t.user?.phone || '',
          t.attendeeInfo?.email || t.user?.email || '',
          t.event?.title || '',
          t.subEvent?.title || '',
          t.tierName,
          t.paymentStatus,
          t.entryStatus,
          t.entryTime ? new Date(t.entryTime).toISOString() : '',
          t.exitTime ? new Date(t.exitTime).toISOString() : '',
        ].map((v) => `"${v}"`).join(',')
      ).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=attendees.csv');
      res.send(headers + rows);
    } else {
      res.json(new ApiResponse(200, { tickets }));
    }
  } catch (err) { next(err); }
};
