const Event = require('../models/Event');
const SubEvent = require('../models/SubEvent');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const IssuedTicket = require('../models/IssuedTicket');
const Review = require('../models/Review');
const AnalyticsSnapshot = require('../models/AnalyticsSnapshot');
const ApiResponse = require('../utils/ApiResponse');
const { getOrSet, invalidatePattern } = require('../config/redis');
const mongoose = require('mongoose');

exports.getOrganizerOverview = async (req, res, next) => {
  try {
    const oid = req.user.id;

    const data = await getOrSet(`analytics:overview:${oid}`, async () => {
      const snapshot = await AnalyticsSnapshot.findOne({ type: 'organizer_overview', scope: oid }).sort({ date: -1 }).lean();
      if (snapshot && snapshot.data) return snapshot.data;

      const organizerId = new mongoose.Types.ObjectId(oid);
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const [events, subEvents, bookingsResult, paymentsResult, todayRevenueResult, ticketsResult, reviewsResult] = await Promise.all([
        Event.find({ organizer: organizerId }),
        SubEvent.find({ organizer: organizerId }),
        Booking.aggregate([
          { $lookup: { from: 'events', localField: 'event', foreignField: '_id', as: 'event' } },
          { $unwind: '$event' },
          { $match: { 'event.organizer': organizerId } },
          { $group: { _id: null, total: { $sum: 1 }, confirmed: { $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] } }, cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } }, refunded: { $sum: { $cond: [{ $eq: ['$status', 'refunded'] }, 1, 0] } }, pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } } } },
        ]),
        Payment.aggregate([
          { $match: { organizer: organizerId, status: 'completed' } },
          { $group: { _id: null, totalRevenue: { $sum: '$amount' }, totalCommission: { $sum: '$commissionAmount' }, organizerEarnings: { $sum: '$organizerAmount' }, count: { $sum: 1 } } },
        ]),
        Payment.aggregate([
          { $match: { organizer: organizerId, status: 'completed', createdAt: { $gte: todayStart } } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        IssuedTicket.aggregate([
          { $lookup: { from: 'events', localField: 'event', foreignField: '_id', as: 'event' } },
          { $unwind: '$event' },
          { $match: { 'event.organizer': organizerId } },
          { $group: { _id: null, total: { $sum: 1 }, checkedIn: { $sum: { $cond: [{ $eq: ['$entryStatus', 'checked_in'] }, 1, 0] } }, checkedOut: { $sum: { $cond: [{ $eq: ['$entryStatus', 'checked_out'] }, 1, 0] } }, unused: { $sum: { $cond: [{ $eq: ['$entryStatus', 'unused'] }, 1, 0] } } } },
        ]),
        Review.aggregate([
          { $lookup: { from: 'events', localField: 'event', foreignField: '_id', as: 'event' } },
          { $unwind: '$event' },
          { $match: { 'event.organizer': organizerId, isVisible: true } },
          { $group: { _id: null, averageRating: { $avg: '$rating' }, total: { $sum: 1 } } },
        ]),
      ]);

      const upcoming = events.filter((e) => e.status === 'published' && new Date(e.startDate) > new Date());
      const completed = events.filter((e) => e.status === 'completed');
      const cancelled = events.filter((e) => e.status === 'cancelled');

      const result = {
        events: { total: events.length, upcoming: upcoming.length, completed: completed.length, cancelled: cancelled.length },
        subEvents: subEvents.length,
        revenue: { total: paymentsResult[0]?.totalRevenue || 0, commission: paymentsResult[0]?.totalCommission || 0, earnings: paymentsResult[0]?.organizerEarnings || 0, todayRevenue: todayRevenueResult[0]?.total || 0 },
        bookings: bookingsResult[0] || { total: 0, confirmed: 0, cancelled: 0, refunded: 0, pending: 0 },
        tickets: ticketsResult[0] || { total: 0, checkedIn: 0, checkedOut: 0, unused: 0 },
        ratings: reviewsResult[0] || { averageRating: 0, total: 0 },
      };

      await AnalyticsSnapshot.findOneAndUpdate(
        { type: 'organizer_overview', scope: oid },
        { type: 'organizer_overview', scope: oid, date: new Date(), data: result },
        { upsert: true }
      );

      return result;
    }, 1800);

    res.json(new ApiResponse(200, data));
  } catch (err) { next(err); }
};

exports.getRevenueChart = async (req, res, next) => {
  try {
    const oid = req.user.id;
    const months = parseInt(req.query.months) || 12;

    const data = await getOrSet(`analytics:revenue:${oid}:${months}`, async () => {
      const organizerId = new mongoose.Types.ObjectId(oid);
      const since = new Date();
      since.setMonth(since.getMonth() - months);

      return Payment.aggregate([
        { $match: { organizer: organizerId, status: 'completed', createdAt: { $gte: since } } },
        { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, revenue: { $sum: '$amount' }, commission: { $sum: '$commissionAmount' }, earnings: { $sum: '$organizerAmount' }, count: { $sum: 1 } } },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]);
    }, 3600);

    res.json(new ApiResponse(200, { data }));
  } catch (err) { next(err); }
};

exports.getTicketSalesChart = async (req, res, next) => {
  try {
    const oid = req.user.id;
    const months = parseInt(req.query.months) || 6;

    const data = await getOrSet(`analytics:tickets:${oid}:${months}`, async () => {
      const organizerId = new mongoose.Types.ObjectId(oid);
      const since = new Date();
      since.setMonth(since.getMonth() - months);

      return IssuedTicket.aggregate([
        { $lookup: { from: 'events', localField: 'event', foreignField: '_id', as: 'event' } },
        { $unwind: '$event' },
        { $match: { 'event.organizer': organizerId, createdAt: { $gte: since } } },
        { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, tickets: { $sum: 1 } } },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]);
    }, 3600);

    res.json(new ApiResponse(200, { data }));
  } catch (err) { next(err); }
};

exports.getTopEvents = async (req, res, next) => {
  try {
    const oid = req.user.id;

    const data = await getOrSet(`analytics:topEvents:${oid}`, async () => {
      const organizerId = new mongoose.Types.ObjectId(oid);
      return Event.aggregate([
        { $match: { organizer: organizerId } },
        { $lookup: { from: 'issuedtickets', localField: '_id', foreignField: 'event', as: 'tickets' } },
        { $project: { _id: 1, title: 1, bannerImage: 1, totalCapacity: 1, soldCount: 1, ticketCount: { $size: '$tickets' }, checkedIn: { $size: { $filter: { input: '$tickets', as: 't', cond: { $eq: ['$$t.entryStatus', 'checked_in'] } } } } } },
        { $sort: { ticketCount: -1 } },
        { $limit: 10 },
      ]);
    }, 3600);

    res.json(new ApiResponse(200, { data }));
  } catch (err) { next(err); }
};

exports.getRecentBookings = async (req, res, next) => {
  try {
    const oid = req.user.id;

    const data = await getOrSet(`analytics:recentBookings:${oid}`, async () => {
      const organizerId = new mongoose.Types.ObjectId(oid);
      return Booking.aggregate([
        { $lookup: { from: 'events', localField: 'event', foreignField: '_id', as: 'event' } },
        { $unwind: '$event' },
        { $match: { 'event.organizer': organizerId } },
        { $sort: { createdAt: -1 } },
        { $limit: 10 },
        { $lookup: { from: 'users', localField: 'user', foreignField: '_id', as: 'user' } },
        { $unwind: '$user' },
        { $project: { _id: 1, bookingRef: 1, totalAmount: 1, status: 1, createdAt: 1, 'user.name': 1, 'user.email': 1, 'user.avatar': 1, 'event.title': 1 } },
      ]);
    }, 300);

    res.json(new ApiResponse(200, { bookings: data }));
  } catch (err) { next(err); }
};

exports.getCategoryDistribution = async (req, res, next) => {
  try {
    const oid = req.user.id;

    const data = await getOrSet(`analytics:categories:${oid}`, async () => {
      const organizerId = new mongoose.Types.ObjectId(oid);
      return Event.aggregate([
        { $match: { organizer: organizerId } },
        { $group: { _id: '$category', count: { $sum: 1 }, soldTickets: { $sum: '$soldCount' } } },
        { $sort: { count: -1 } },
      ]);
    }, 3600);

    res.json(new ApiResponse(200, { data }));
  } catch (err) { next(err); }
};
