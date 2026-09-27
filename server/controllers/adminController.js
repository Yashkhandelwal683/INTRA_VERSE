const User     = require('../models/User');
const Event    = require('../models/Event');
const Booking  = require('../models/Booking');
const Payment  = require('../models/Payment');
const Registration = require('../models/Registration');
const IssuedTicket = require('../models/IssuedTicket');
const AnalyticsSnapshot = require('../models/AnalyticsSnapshot');
const ApiResponse = require('../utils/ApiResponse');
const { getOrSet, invalidatePattern } = require('../config/redis');

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const COMMISSION_RATE = parseFloat(process.env.COMMISSION_RATE || '10');

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

exports.getAdminStats = async (req, res, next) => {
  try {
    const data = await getOrSet('admin:stats:global', async () => {
      const snapshot = await AnalyticsSnapshot.findOne({ type: 'admin_stats', scope: 'global' }).sort({ date: -1 }).lean();
      if (snapshot && snapshot.data) return snapshot.data;

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const [
        totalUsers, totalAttendees, totalOrganizers,
        pendingOrganizers, approvedOrganizers, rejectedOrganizers,
        totalEvents, liveEvents, draftEvents, completedEvents, cancelledEvents,
        totalBookings, todayBookings,
        revenueAgg, todayRevenueAgg, pendingPayoutAgg,
        activeTickets, totalRegistrations,
      ] = await Promise.all([
        User.countDocuments(),
        User.countDocuments({ role: 'attendee' }),
        User.countDocuments({ role: 'organizer' }),
        User.countDocuments({ role: 'organizer', approvalStatus: 'pending' }),
        User.countDocuments({ role: 'organizer', approvalStatus: 'approved' }),
        User.countDocuments({ role: 'organizer', approvalStatus: 'rejected' }),
        Event.countDocuments(),
        Event.countDocuments({ status: 'published', startDate: { $lte: now }, endDate: { $gte: now } }),
        Event.countDocuments({ status: 'draft' }),
        Event.countDocuments({ status: 'completed' }),
        Event.countDocuments({ status: 'cancelled' }),
        Booking.countDocuments({ status: { $ne: 'cancelled' } }),
        Booking.countDocuments({ status: { $ne: 'cancelled' }, createdAt: { $gte: todayStart } }),
        Payment.aggregate([
          { $match: { status: 'completed' } },
          { $group: { _id: null, total: { $sum: '$amount' }, commission: { $sum: '$commissionAmount' }, earnings: { $sum: '$organizerAmount' }, count: { $sum: 1 } } },
        ]),
        Payment.aggregate([
          { $match: { status: 'completed', createdAt: { $gte: todayStart } } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        Booking.aggregate([
          { $match: { status: 'confirmed' } },
          { $group: { _id: null, total: { $sum: '$totalAmount' } } },
        ]),
        IssuedTicket.countDocuments({ paymentStatus: 'completed' }),
        Registration.countDocuments({ paymentStatus: { $in: ['pending', 'paid'] } }),
      ]);

      const rev = revenueAgg[0] || { total: 0, commission: 0, earnings: 0, count: 0 };
      const result = {
        totalUsers, totalAttendees, totalOrganizers,
        pendingOrganizerRequests: pendingOrganizers, approvedOrganizers, rejectedOrganizers,
        totalEvents, liveEvents, draftEvents, completedEvents, cancelledEvents,
        totalBookings, todayBookings, activeTickets, totalRegistrations,
        totalRevenue: rev.total, totalCommission: rev.commission,
        organizerEarnings: rev.earnings, todayRevenue: todayRevenueAgg[0]?.total || 0,
        pendingPayout: pendingPayoutAgg[0]?.total || 0,
      };

      await AnalyticsSnapshot.findOneAndUpdate(
        { type: 'admin_stats', scope: 'global' },
        { type: 'admin_stats', scope: 'global', date: new Date(), data: result },
        { upsert: true }
      );

      return result;
    }, 3600);

    res.json(new ApiResponse(200, data));
  } catch (err) { next(err); }
};

exports.getAdminAnalytics = async (req, res, next) => {
  try {
    const data = await getOrSet('admin:analytics:global', async () => {
      const snapshot = await AnalyticsSnapshot.findOne({ type: 'admin_analytics', scope: 'global' }).sort({ date: -1 }).lean();
      if (snapshot && snapshot.data) return snapshot.data;

      const [monthlyRevenue, monthlyBookings, userGrowth, categoryDist, topEvents, dailyRegistrations] = await Promise.all([
        Payment.aggregate([
          { $match: { status: 'completed' } },
          { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, revenue: { $sum: '$amount' }, count: { $sum: 1 } } },
          { $sort: { '_id.year': 1, '_id.month': 1 } },
        ]),
        Booking.aggregate([
          { $match: { status: { $ne: 'cancelled' } } },
          { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, count: { $sum: 1 } } },
          { $sort: { '_id.year': 1, '_id.month': 1 } },
        ]),
        User.aggregate([
          { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, count: { $sum: 1 } } },
          { $sort: { '_id.year': 1, '_id.month': 1 } },
        ]),
        Event.aggregate([
          { $group: { _id: '$category', count: { $sum: 1 }, sold: { $sum: '$soldCount' } } },
          { $sort: { count: -1 } },
        ]),
        Event.aggregate([
          { $sort: { soldCount: -1 } },
          { $limit: 10 },
          { $lookup: { from: 'users', localField: 'organizer', foreignField: '_id', as: 'organizer' } },
          { $unwind: { path: '$organizer', preserveNullAndEmptyArrays: true } },
          { $project: { title: 1, soldCount: 1, totalCapacity: 1, category: 1, 'organizer.name': 1 } },
        ]),
        User.aggregate([
          { $match: { createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
          { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ]),
      ]);

      const result = {
        monthlyRevenue, monthlyBookings, userGrowth,
        categoryDistribution: categoryDist, topEvents, dailyRegistrations,
      };

      await AnalyticsSnapshot.findOneAndUpdate(
        { type: 'admin_analytics', scope: 'global' },
        { type: 'admin_analytics', scope: 'global', date: new Date(), data: result },
        { upsert: true }
      );

      return result;
    }, 3600);

    res.json(new ApiResponse(200, data));
  } catch (err) { next(err); }
};

exports.getAdminEvents = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const filter = {};
    if (status) filter.status = status;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const data = await getOrSet(`admin:events:${status || 'all'}:${page}`, async () => {
      const [events, total] = await Promise.all([
        Event.find(filter).populate('organizer', 'name email').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
        Event.countDocuments(filter),
      ]);

      const eventIds = events.map((e) => e._id);
      const regStats = await Registration.aggregate([
        { $match: { event: { $in: eventIds }, paymentStatus: 'paid' } },
        { $group: { _id: '$event', registrations: { $sum: 1 }, revenue: { $sum: '$grandTotal' } } },
      ]);

      const regMap = {};
      regStats.forEach((r) => { regMap[r._id.toString()] = r; });

      const enriched = events.map((e) => {
        const stats = regMap[e._id.toString()] || { registrations: 0, revenue: 0 };
        const commission = stats.revenue * (COMMISSION_RATE / 100);
        return { ...e, registrations: stats.registrations, totalRevenue: stats.revenue, commission, organizerEarnings: stats.revenue - commission };
      });

      return { events: enriched, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } };
    }, 300);

    res.json(new ApiResponse(200, data));
  } catch (err) { next(err); }
};

exports.getAdminRevenue = async (req, res, next) => {
  try {
    const data = await getOrSet('admin:revenue:global', async () => {
      const snapshot = await AnalyticsSnapshot.findOne({ type: 'admin_revenue', scope: 'global' }).sort({ date: -1 }).lean();
      if (snapshot && snapshot.data) return snapshot.data;

      const now = new Date();
      const monthlyRevenue = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const start = new Date(d.getFullYear(), d.getMonth(), 1);
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
        const agg = await Payment.aggregate([
          { $match: { status: 'completed', createdAt: { $gte: start, $lte: end } } },
          { $group: { _id: null, revenue: { $sum: '$amount' }, commission: { $sum: '$commissionAmount' } } },
        ]);
        const row = agg[0] || { revenue: 0, commission: 0 };
        monthlyRevenue.push({ month: MONTHS[d.getMonth()], revenue: row.revenue, commission: row.commission });
      }

      const payments = await Payment.find({ status: 'completed' }).sort({ createdAt: -1 }).limit(20)
        .populate({ path: 'booking', populate: [{ path: 'event', select: 'title' }, { path: 'user', select: 'name' }] }).lean();

      const recentTransactions = payments.map((p, i) => ({
        id: `#TXN-${String(i + 1).padStart(3, '0')}`,
        event: p.booking?.event?.title || '—',
        user: p.booking?.user?.name || '—',
        amount: p.amount || 0, commission: p.commissionAmount || 0,
        date: p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
      }));

      const result = { monthlyRevenue, recentTransactions };

      await AnalyticsSnapshot.findOneAndUpdate(
        { type: 'admin_revenue', scope: 'global' },
        { type: 'admin_revenue', scope: 'global', date: new Date(), data: result },
        { upsert: true }
      );

      return result;
    }, 3600);

    res.json(new ApiResponse(200, data));
  } catch (err) { next(err); }
};

exports.getAdminBookings = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, eventId, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const filter = {};
    if (status) filter.status = status;
    if (eventId) filter.event = eventId;
    if (search) {
      const q = search.trim();
      const regex = new RegExp(q, 'i');
      const matchingUsers = await User.find({ $or: [{ name: regex }, { email: regex }] }).select('_id').lean();
      const matchingEvents = await Event.find({ title: regex }).select('_id').lean();
      filter.$or = [
        { bookingRef: regex },
        { user: { $in: matchingUsers.map((u) => u._id) } },
        { event: { $in: matchingEvents.map((e) => e._id) } },
      ];
    }

    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('event', 'title startDate endDate venue category')
        .populate('user', 'name email avatar')
        .populate('organizer', 'name email organizationName')
        .lean(),
      Booking.countDocuments(filter),
    ]);

    const enriched = bookings.map((b) => ({
      _id: b._id,
      bookingRef: b.bookingRef || null,
      event: b.event,
      user: b.user,
      organizer: b.organizer,
      tickets: b.tickets || [],
      ticketCount: (b.tickets || []).reduce((sum, t) => sum + (t.quantity || 0), 0),
      totalAmount: b.totalAmount || 0,
      status: b.status,
      attendeeInfo: b.attendeeInfo || null,
      paymentId: b.paymentId,
      qrCode: b.qrCode || null,
      cancellationStatus: b.cancellationStatus || 'none',
      refundStatus: b.refundStatus || 'none',
      refundAmount: b.refundAmount || 0,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
    }));

    res.json(new ApiResponse(200, {
      bookings: enriched,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    }, 'Bookings fetched'));
  } catch (err) { next(err); }
};

exports.getAdminBookingStats = async (req, res, next) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [total, confirmed, pending, cancelled, refunded, todayCount, revenueAgg] = await Promise.all([
      Booking.countDocuments(),
      Booking.countDocuments({ status: 'confirmed' }),
      Booking.countDocuments({ status: 'pending' }),
      Booking.countDocuments({ status: 'cancelled' }),
      Booking.countDocuments({ status: 'refunded' }),
      Booking.countDocuments({ createdAt: { $gte: todayStart } }),
      Booking.aggregate([
        { $match: { status: 'confirmed' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
    ]);

    res.json(new ApiResponse(200, {
      total, confirmed, pending, cancelled, refunded,
      todayCount,
      totalRevenue: revenueAgg[0]?.total || 0,
    }, 'Booking stats'));
  } catch (err) { next(err); }
};
