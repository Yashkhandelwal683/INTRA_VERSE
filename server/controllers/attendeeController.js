const Booking = require('../models/Booking');
const IssuedTicket = require('../models/IssuedTicket');
const Notification = require('../models/Notification');
const Event = require('../models/Event');
const Wishlist = require('../models/Wishlist');
const AnalyticsSnapshot = require('../models/AnalyticsSnapshot');
const ApiResponse = require('../utils/ApiResponse');
const { getOrSet, invalidatePattern } = require('../config/redis');
const mongoose = require('mongoose');

exports.getDashboard = async (req, res, next) => {
  try {
    const uid = req.user.id;

    const data = await getOrSet(`attendee:dashboard:${uid}`, async () => {
      const snapshot = await AnalyticsSnapshot.findOne({ type: 'attendee_dashboard', scope: uid }).sort({ date: -1 }).lean();
      if (snapshot && snapshot.data) return snapshot.data;

      const objectId = new mongoose.Types.ObjectId(uid);
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const [
        bookingsAgg, todayBookings, upcomingBookings, upcomingCount, completedBookings, cancelledBookings,
        issuedTickets, ticketsCount, unreadNotifs, recentBookings, wishlistCount, wishlistItems, recentNotifications,
      ] = await Promise.all([
        Booking.aggregate([
          { $match: { user: objectId, status: { $in: ['pending', 'confirmed'] } } },
          { $group: { _id: null, total: { $sum: 1 }, totalSpent: { $sum: '$totalAmount' } } },
        ]),
        Booking.countDocuments({ user: objectId, createdAt: { $gte: todayStart } }),
        Booking.aggregate([
          { $match: { user: objectId, status: 'confirmed' } },
          { $lookup: { from: 'events', localField: 'event', foreignField: '_id', as: 'eventData' } },
          { $unwind: { path: '$eventData', preserveNullAndEmptyArrays: true } },
          { $match: { 'eventData.startDate': { $gte: now } } },
          { $sort: { 'eventData.startDate': 1 } },
          { $limit: 5 },
          { $project: { _id: 1, bookingRef: 1, totalAmount: 1, status: 1, createdAt: 1, tickets: 1, attendeeInfo: 1, event: { _id: '$eventData._id', title: '$eventData.title', bannerImage: '$eventData.bannerImage', venue: '$eventData.venue', startDate: '$eventData.startDate', category: '$eventData.category' } } },
        ]),
        Booking.aggregate([
          { $match: { user: objectId, status: 'confirmed' } },
          { $lookup: { from: 'events', localField: 'event', foreignField: '_id', as: 'eventData' } },
          { $unwind: { path: '$eventData', preserveNullAndEmptyArrays: true } },
          { $match: { 'eventData.startDate': { $gte: now } } },
          { $count: 'total' },
        ]),
        Booking.countDocuments({ user: objectId, status: 'confirmed' }),
        Booking.countDocuments({ user: objectId, status: 'cancelled' }),
        IssuedTicket.find({ user: objectId }).populate('event', 'title startDate venue').sort({ createdAt: -1 }).limit(10).lean(),
        IssuedTicket.countDocuments({ user: objectId }),
        Notification.countDocuments({ user: objectId, isRead: false }),
        Booking.find({ user: objectId }).populate('event', 'title bannerImage venue startDate category').sort({ createdAt: -1 }).limit(10).lean(),
        Wishlist.countDocuments({ user: objectId }),
        Wishlist.find({ user: objectId }).populate('event', 'title bannerImage startDate category venue').sort({ createdAt: -1 }).limit(5).lean(),
        Notification.find({ user: objectId }).sort({ createdAt: -1 }).limit(8).lean(),
      ]);

      const eventIds = [...new Set(issuedTickets.filter((t) => t.event?._id).map((t) => t.event._id.toString()))];
      const recommendedEvents = eventIds.length > 0
        ? await Event.find({ _id: { $nin: eventIds }, status: 'published', startDate: { $gte: now } }).sort({ soldCount: -1 }).limit(6).lean()
        : await Event.find({ status: 'published', startDate: { $gte: now } }).sort({ soldCount: -1 }).limit(6).lean();

      const result = {
        counts: {
          totalBookings: bookingsAgg[0]?.total || 0, totalSpent: bookingsAgg[0]?.totalSpent || 0,
          todayBookings, upcomingEvents: upcomingCount[0]?.total || 0, completedEvents: completedBookings,
          cancelledBookings: cancelledBookings, ticketsCount,
          unreadNotifications: unreadNotifs, wishlistCount,
        },
        upcomingBookings, recentBookings, recentTickets: issuedTickets.slice(0, 5),
        recommendedEvents, wishlistItems, recentNotifications, unreadNotifications: unreadNotifs,
      };

      await AnalyticsSnapshot.findOneAndUpdate(
        { type: 'attendee_dashboard', scope: uid },
        { type: 'attendee_dashboard', scope: uid, date: new Date(), data: result },
        { upsert: true }
      );

      return result;
    }, 900);

    res.json(new ApiResponse(200, data));
  } catch (err) { next(err); }
};
