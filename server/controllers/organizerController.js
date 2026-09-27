const Event = require('../models/Event');
const Registration = require('../models/Registration');
const SubEvent = require('../models/SubEvent');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const IssuedTicket = require('../models/IssuedTicket');
const Review = require('../models/Review');
const Notification = require('../models/Notification');
const AnalyticsSnapshot = require('../models/AnalyticsSnapshot');
const ApiResponse = require('../utils/ApiResponse');
const { getOrSet, invalidatePattern } = require('../config/redis');
const mongoose = require('mongoose');

exports.getDashboard = async (req, res, next) => {
  try {
    const oid = req.user.id;

    const data = await getOrSet(`org:dashboard:${oid}`, async () => {
      // Always compute live data. The AnalyticsSnapshot is only written here (and by the
      // scheduled analytics job) as a persisted copy; we never serve it directly, because
      // doing so would return stale numbers (e.g. totalEvents: 0) until the next job run,
      // breaking real-time refresh after an organizer creates/edits an event or gets a booking.
      const objectId = new mongoose.Types.ObjectId(oid);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const [events, regAgg, paymentAgg, reviewAgg, notifCount, todayBookings, pendingRefunds, ticketSold] = await Promise.all([
        Event.find({ organizer: objectId }).sort({ startDate: -1 }).lean(),
        Registration.aggregate([
          { $match: { organizer: objectId, paymentStatus: 'paid' } },
          { $group: { _id: null, total: { $sum: 1 }, revenue: { $sum: '$grandTotal' } } },
        ]),
        Payment.aggregate([
          { $match: { organizer: objectId, status: 'completed' } },
          { $group: { _id: null, totalRevenue: { $sum: '$amount' }, totalCommission: { $sum: '$commissionAmount' }, organizerEarnings: { $sum: '$organizerAmount' }, count: { $sum: 1 } } },
        ]),
        Review.aggregate([
          { $lookup: { from: 'events', localField: 'event', foreignField: '_id', as: 'ev' } },
          { $unwind: '$ev' },
          { $match: { 'ev.organizer': objectId, isVisible: true } },
          { $group: { _id: null, avg: { $avg: '$rating' }, total: { $sum: 1 } } },
        ]),
        Notification.countDocuments({ user: objectId, isRead: false }),
        Booking.aggregate([
          { $lookup: { from: 'events', localField: 'event', foreignField: '_id', as: 'ev' } },
          { $unwind: '$ev' },
          { $match: { 'ev.organizer': objectId, status: 'confirmed', createdAt: { $gte: today, $lt: tomorrow } } },
          { $count: 'total' },
        ]),
        Booking.aggregate([
          { $lookup: { from: 'events', localField: 'event', foreignField: '_id', as: 'ev' } },
          { $unwind: '$ev' },
          { $match: { 'ev.organizer': objectId, cancellationStatus: 'requested' } },
          { $count: 'total' },
        ]),
        Event.aggregate([{ $match: { organizer: objectId } }, { $group: { _id: null, sold: { $sum: '$soldCount' } } }]),
      ]);

      const now = new Date();
      const upcoming = events.filter((e) => e.status === 'published' && new Date(e.startDate) > now);
      const live = events.filter((e) => e.status === 'published' && new Date(e.startDate) <= now && new Date(e.endDate || e.startDate) >= now);
      const completed = events.filter((e) => e.status === 'completed');
      const drafts = events.filter((e) => e.status === 'draft');
      const cancelled = events.filter((e) => e.status === 'cancelled');

      const reg = regAgg[0] || { total: 0, revenue: 0 };
      const pay = paymentAgg[0] || { totalRevenue: 0, totalCommission: 0, organizerEarnings: 0, count: 0 };
      const totalTicketsSold = ticketSold[0]?.sold || 0;
      const nextEvent = upcoming.length > 0 ? upcoming.sort((a, b) => new Date(a.startDate) - new Date(b.startDate))[0] : null;

      const result = {
        counts: {
          totalEvents: events.length, upcomingEvents: upcoming.length, liveEvents: live.length,
          completedEvents: completed.length, draftEvents: drafts.length, cancelledEvents: cancelled.length,
          totalRegistrations: reg.total,
          unreadNotifications: notifCount, totalTicketsSold,
          todayCheckIns: todayBookings[0]?.total || 0, pendingRefunds: pendingRefunds[0]?.total || 0,
        },
        revenue: { total: pay.totalRevenue, registrations: reg.revenue, commission: pay.totalCommission, earnings: pay.organizerEarnings },
        ratings: { average: reviewAgg[0]?.avg || 0, total: reviewAgg[0]?.total || 0 },
        nextEvent: nextEvent ? { id: nextEvent._id, title: nextEvent.title, startDate: nextEvent.startDate, venue: nextEvent.venue, poster: nextEvent.poster } : null,
        events: events.slice(0, 10),
      };

      await AnalyticsSnapshot.findOneAndUpdate(
        { type: 'organizer_dashboard', scope: oid },
        { type: 'organizer_dashboard', scope: oid, date: new Date(), data: result },
        { upsert: true }
      );

      return result;
    }, 1800);

    res.json(new ApiResponse(200, { welcome: { name: req.user.name || 'Organizer' }, ...data }));
  } catch (err) { next(err); }
};

exports.getOrganizerEvents = async (req, res, next) => {
  try {
    const oid = req.user.id;
    const { status, page = 1, limit = 20 } = req.query;

    const data = await getOrSet(`org:events:${oid}:${status || 'all'}:${page}`, async () => {
      const objectId = new mongoose.Types.ObjectId(oid);
      const query = { organizer: objectId };
      if (status) query.status = status;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [events, total] = await Promise.all([
        Event.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
        Event.countDocuments(query),
      ]);

      const eventIds = events.map((e) => e._id);
      const regStats = await Registration.aggregate([
        { $match: { event: { $in: eventIds }, paymentStatus: 'paid' } },
        { $group: { _id: '$event', total: { $sum: 1 }, revenue: { $sum: '$grandTotal' } } },
      ]);

      const regMap = {};
      regStats.forEach((r) => { regMap[r._id.toString()] = r; });

      const enriched = events.map((e) => {
        const s = regMap[e._id.toString()] || { total: 0, revenue: 0 };
        return { ...e, registrations: s.total, totalRevenue: s.revenue };
      });

      return { events: enriched, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } };
    }, 300);

    res.json(new ApiResponse(200, data));
  } catch (err) { next(err); }
};

exports.getEventDetail = async (req, res, next) => {
  try {
    const oid = req.user.id;
    const { eventId } = req.params;

    const data = await getOrSet(`org:event:${oid}:${eventId}`, async () => {
      const objectId = new mongoose.Types.ObjectId(oid);
      const event = await Event.findOne({ _id: eventId, organizer: objectId }).lean();
      if (!event) return null;

      const [regs, bookings, tickets, reviews, payments] = await Promise.all([
        Registration.find({ event: event._id }).populate('attendee', 'name email avatar').sort({ createdAt: -1 }).lean(),
        Booking.find({ event: event._id }).populate('user', 'name email avatar').populate('tickets.ticket', 'name type price').sort({ createdAt: -1 }).lean(),
        require('../models/Ticket').find({ event: event._id }).lean(),
        Review.find({ event: event._id }).populate('user', 'name avatar').sort({ createdAt: -1 }).lean(),
        Payment.find({ event: event._id }).sort({ createdAt: -1 }).lean(),
      ]);

      const paidRegs = regs.filter((r) => r.paymentStatus === 'paid');
      const paidBookings = bookings.filter((b) => b.status === 'confirmed');
      const totalRevenue = paidRegs.reduce((s, r) => s + (r.grandTotal || r.amount || 0), 0) + paidBookings.reduce((s, b) => s + (b.totalAmount || 0), 0);
      const totalPayments = payments.reduce((s, p) => s + (p.amount || 0), 0);
      const totalCommission = payments.reduce((s, p) => s + (p.commissionAmount || 0), 0);
      const organizerEarnings = payments.reduce((s, p) => s + (p.organizerAmount || 0), 0);
      const totalRegistrants = regs.length + bookings.length;
      const avgRating = reviews.length > 0 ? (reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length).toFixed(1) : 0;

      const stats = {
        totalRegistrations: totalRegistrants,
        totalPaid: paidRegs.length + paidBookings.length,
        totalPending: regs.filter((r) => r.paymentStatus === 'pending').length + bookings.filter((b) => b.status === 'pending').length,
        totalRefunded: regs.filter((r) => r.paymentStatus === 'refunded').length + bookings.filter((b) => b.status === 'refunded').length,
        approved: regs.filter((r) => r.ticketStatus === 'approved').length,
        pendingApproval: regs.filter((r) => r.ticketStatus === 'pending_approval').length,
        rejected: regs.filter((r) => r.ticketStatus === 'rejected').length,
        remainingSeats: event.maxParticipants ? Math.max(0, event.maxParticipants - totalRegistrants) : null,
        revenue: totalRevenue, totalPayments, totalCommission, organizerEarnings,
        totalBookings: bookings.length, ticketTypes: tickets.length,
        totalReviews: reviews.length, avgRating: Number(avgRating),
      };

      return { event, registrations: regs, bookings, tickets, reviews, payments, stats };
    }, 300);

    if (!data) return res.status(404).json(new ApiResponse(404, null, 'Event not found'));
    res.json(new ApiResponse(200, data));
  } catch (err) { next(err); }
};

exports.exportRegistrations = async (req, res, next) => {
  try {
    const oid = new mongoose.Types.ObjectId(req.user.id);
    const event = await Event.findOne({ _id: req.params.eventId, organizer: oid }).lean();
    if (!event) return res.status(404).json(new ApiResponse(404, null, 'Event not found'));

    const regs = await Registration.find({ event: event._id }).sort({ createdAt: -1 }).lean();
    const format = req.query.format || 'csv';

    if (format === 'excel') {
      const jsonl = regs.map((r) => JSON.stringify({
        'Registration ID': r._id, 'Type': r.registrationType, 'Team Name': r.teamName || '',
        'Members': r.members.map((m) => `${m.name} (${m.email}${m.phone ? `, ${m.phone}` : ''})`).join('; '),
        'Amount Paid': r.amountPaid, 'Payment Status': r.paymentStatus, 'Registered At': new Date(r.createdAt).toISOString(),
      })).join('\n');
      res.setHeader('Content-Type', 'application/jsonl');
      res.setHeader('Content-Disposition', `attachment; filename=registrations-${event._id}.jsonl`);
      return res.send(jsonl);
    }

    const headers = 'Registration ID,Type,Team Name,Member Name,Member Email,Member Phone,Amount Paid,Payment Status,Registered At\n';
    const rows = regs.flatMap((r) => {
      if (r.members.length === 0) return [[r._id, r.registrationType, r.teamName || '', '', '', '', r.amountPaid, r.paymentStatus, new Date(r.createdAt).toISOString()].map((v) => `"${v}"`).join(',')];
      return r.members.map((m) => [r._id, r.registrationType, r.teamName || '', m.name, m.email, m.phone || '', r.amountPaid, r.paymentStatus, new Date(r.createdAt).toISOString()].map((v) => `"${v}"`).join(','));
    }).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=registrations-${event._id}.csv`);
    res.send(headers + rows);
  } catch (err) { next(err); }
};

exports.getRevenue = async (req, res, next) => {
  try {
    const oid = req.user.id;
    const period = req.query.period || 'monthly';

    const data = await getOrSet(`org:revenue:${oid}:${period}`, async () => {
      const objectId = new mongoose.Types.ObjectId(oid);
      let groupFormat;
      if (period === 'daily') groupFormat = { year: { $year: '$createdAt' }, month: { $month: '$createdAt' }, day: { $dayOfMonth: '$createdAt' } };
      else if (period === 'weekly') groupFormat = { year: { $year: '$createdAt' }, week: { $week: '$createdAt' } };
      else groupFormat = { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } };

      const events = await Event.find({ organizer: objectId }).select('_id').lean();
      const eventIds = events.map(e => e._id);

      const [regRevenue, paymentData, totals, regTotal, refundAgg] = await Promise.all([
        Registration.aggregate([
          { $match: { organizer: objectId, paymentStatus: 'paid' } },
          { $group: { _id: groupFormat, revenue: { $sum: '$grandTotal' }, count: { $sum: 1 } } },
          { $sort: { '_id.year': 1, '_id.month': 1 } },
        ]),
        Payment.aggregate([
          { $match: { organizer: objectId, status: 'completed' } },
          { $group: { _id: groupFormat, revenue: { $sum: '$amount' }, count: { $sum: 1 } } },
          { $sort: { '_id.year': 1, '_id.month': 1 } },
        ]),
        Payment.aggregate([
          { $match: { organizer: objectId, status: 'completed' } },
          { $group: { _id: null, total: { $sum: '$amount' }, commission: { $sum: '$commissionAmount' }, earnings: { $sum: '$organizerAmount' }, count: { $sum: 1 } } },
        ]),
        Registration.aggregate([
          { $match: { organizer: objectId, paymentStatus: 'paid' } },
          { $group: { _id: null, total: { $sum: '$grandTotal' }, count: { $sum: 1 } } },
        ]),
        Booking.aggregate([
          { $match: { event: { $in: eventIds }, status: 'refunded' } },
          { $group: { _id: null, total: { $sum: '$refundAmount' }, count: { $sum: 1 } } },
        ]),
      ]);

      const refundData = refundAgg[0] || { total: 0, count: 0 };

      return {
        registrationRevenue: regRevenue, paymentRevenue: paymentData,
        totals: {
          registrations: regTotal[0] || { total: 0, count: 0 },
          payments: totals[0] || { total: 0, commission: 0, earnings: 0, count: 0 },
        },
        refunds: { total: refundData.total, count: refundData.count },
        pendingPayout: (totals[0]?.earnings || 0) - refundData.total,
      };
    }, 1800);

    res.json(new ApiResponse(200, data));
  } catch (err) { next(err); }
};

exports.getAttendees = async (req, res, next) => {
  try {
    const oid = new mongoose.Types.ObjectId(req.user.id);
    const { search, event: eventFilter, page = 1, limit = 50, export: isExport } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const events = await Event.find({ organizer: oid }).select('_id').lean();
    const eventIds = events.map((e) => e._id);

    const query = { event: { $in: eventIds } };
    if (eventFilter) query.event = new mongoose.Types.ObjectId(eventFilter);
    if (search) {
      query.$or = [
        { 'members.name': { $regex: search, $options: 'i' } },
        { 'members.email': { $regex: search, $options: 'i' } },
        { teamName: { $regex: search, $options: 'i' } },
      ];
    }

    if (isExport === 'true') {
      const regs = await Registration.find(query).populate('event', 'title').lean();
      const headers = 'Type,Team Name,Member Name,Member Email,Member Phone,Event,Amount Paid,Status,Registered At\n';
      const rows = regs.flatMap((r) => r.members.map((m) => [r.registrationType, r.teamName || '', m.name, m.email, m.phone || '', r.event?.title || '', r.amountPaid, r.paymentStatus, new Date(r.createdAt).toISOString()].map((v) => `"${v}"`).join(','))).join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=attendees.csv');
      return res.send(headers + rows);
    }

    const [registrations, total] = await Promise.all([
      Registration.find(query).populate('event', 'title poster').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      Registration.countDocuments(query),
    ]);

    res.json(new ApiResponse(200, {
      attendees: registrations,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    }));
  } catch (err) { next(err); }
};

exports.getAnalytics = async (req, res, next) => {
  try {
    const oid = req.user.id;

    const data = await getOrSet(`org:analytics:${oid}`, async () => {
      const snapshot = await AnalyticsSnapshot.findOne({ type: 'organizer_analytics', scope: oid }).sort({ date: -1 }).lean();
      if (snapshot && snapshot.data) return snapshot.data;

      const objectId = new mongoose.Types.ObjectId(oid);
      const [regChart, categoryDist, topEvents] = await Promise.all([
        Registration.aggregate([
          { $match: { organizer: objectId, paymentStatus: 'paid' } },
          { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, count: { $sum: 1 }, revenue: { $sum: '$grandTotal' } } },
          { $sort: { '_id.year': 1, '_id.month': 1 } },
        ]),
        Event.aggregate([
          { $match: { organizer: objectId } },
          { $group: { _id: '$category', count: { $sum: 1 }, registrations: { $sum: '$totalBookings' } } },
          { $sort: { count: -1 } },
        ]),
        Registration.aggregate([
          { $match: { organizer: objectId, paymentStatus: 'paid' } },
          { $group: { _id: '$event', count: { $sum: 1 }, revenue: { $sum: '$grandTotal' } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
          { $lookup: { from: 'events', localField: '_id', foreignField: '_id', as: 'event' } },
          { $unwind: '$event' },
          { $project: { _id: 1, title: '$event.title', poster: '$event.poster', registrations: '$count', revenue: 1 } },
        ]),
      ]);

      const result = { registrationChart: regChart, categoryDistribution: categoryDist, topEvents };

      await AnalyticsSnapshot.findOneAndUpdate(
        { type: 'organizer_analytics', scope: oid },
        { type: 'organizer_analytics', scope: oid, date: new Date(), data: result },
        { upsert: true }
      );

      return result;
    }, 3600);

    res.json(new ApiResponse(200, data));
  } catch (err) { next(err); }
};
