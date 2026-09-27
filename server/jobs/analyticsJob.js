const User = require('../models/User');
const Event = require('../models/Event');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const Registration = require('../models/Registration');
const IssuedTicket = require('../models/IssuedTicket');
const Review = require('../models/Review');
const Notification = require('../models/Notification');
const AnalyticsSnapshot = require('../models/AnalyticsSnapshot');
const { invalidatePattern } = require('../config/redis');

const runAnalyticsJob = async () => {
  console.log('📊 [AnalyticsJob] Starting daily analytics precomputation...');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    // Clear stale snapshots older than 2 days to force fresh recomputation
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const deleteResult = await AnalyticsSnapshot.deleteMany({ date: { $lt: twoDaysAgo } });
    if (deleteResult.deletedCount > 0) {
      console.log(`📊 [AnalyticsJob] Cleared ${deleteResult.deletedCount} stale snapshots`);
    }

    await computeAdminStats(today);
    await computeAdminAnalytics(today);
    await computeAdminRevenue(today);
    await computeOrganizerSnapshots(today);
    await invalidatePattern('admin');
    await invalidatePattern('org');
    await invalidatePattern('analytics');
    console.log('📊 [AnalyticsJob] Completed successfully');
  } catch (err) {
    console.error('📊 [AnalyticsJob] Error:', err.message);
  }
};

const computeAdminStats = async (date) => {
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

  const data = {
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
    { type: 'admin_stats', scope: 'global', date: new Date(), data },
    { upsert: true }
  );
};

const computeAdminAnalytics = async (date) => {
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

  const data = {
    monthlyRevenue, monthlyBookings, userGrowth,
    categoryDistribution: categoryDist, topEvents, dailyRegistrations,
  };

  await AnalyticsSnapshot.findOneAndUpdate(
    { type: 'admin_analytics', scope: 'global' },
    { type: 'admin_analytics', scope: 'global', date: new Date(), data },
    { upsert: true }
  );
};

const computeAdminRevenue = async (date) => {
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
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

  const payments = await Payment.find({ status: 'completed' })
    .sort({ createdAt: -1 })
    .limit(20)
    .populate({ path: 'booking', populate: [{ path: 'event', select: 'title' }, { path: 'user', select: 'name' }] })
    .lean();

  const recentTransactions = payments.map((p, i) => ({
    id: `#TXN-${String(i + 1).padStart(3, '0')}`,
    event: p.booking?.event?.title || '—',
    user: p.booking?.user?.name || '—',
    amount: p.amount || 0,
    commission: p.commissionAmount || 0,
    date: p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
  }));

  const data = { monthlyRevenue, recentTransactions };

  await AnalyticsSnapshot.findOneAndUpdate(
    { type: 'admin_revenue', scope: 'global' },
    { type: 'admin_revenue', scope: 'global', date: new Date(), data },
    { upsert: true }
  );
};

const computeOrganizerSnapshots = async (date) => {
  const organizers = await User.find({ role: 'organizer', approvalStatus: 'approved' }).select('_id').lean();

  for (const org of organizers) {
    const oid = org._id;

    const [
      events, regAgg, paymentAgg, reviewAgg, notifCount, todayBookings, pendingRefunds, ticketSold,
    ] = await Promise.all([
      Event.find({ organizer: oid }).sort({ startDate: -1 }).lean(),
      Registration.aggregate([
        { $match: { organizer: oid, paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: 1 }, revenue: { $sum: '$grandTotal' } } },
      ]),
      Payment.aggregate([
        { $match: { organizer: oid, status: 'completed' } },
        { $group: { _id: null, totalRevenue: { $sum: '$amount' }, totalCommission: { $sum: '$commissionAmount' }, organizerEarnings: { $sum: '$organizerAmount' }, count: { $sum: 1 } } },
      ]),
      Review.aggregate([
        { $lookup: { from: 'events', localField: 'event', foreignField: '_id', as: 'ev' } },
        { $unwind: '$ev' },
        { $match: { 'ev.organizer': oid, isVisible: true } },
        { $group: { _id: null, avg: { $avg: '$rating' }, total: { $sum: 1 } } },
      ]),
      Notification.countDocuments({ user: oid, isRead: false }),
      Booking.aggregate([
        { $lookup: { from: 'events', localField: 'event', foreignField: '_id', as: 'ev' } },
        { $unwind: '$ev' },
        { $match: { 'ev.organizer': oid, status: 'confirmed', createdAt: { $gte: new Date(date), $lt: new Date(date.getTime() + 86400000) } } },
        { $count: 'total' },
      ]),
      Booking.aggregate([
        { $lookup: { from: 'events', localField: 'event', foreignField: '_id', as: 'ev' } },
        { $unwind: '$ev' },
        { $match: { 'ev.organizer': oid, cancellationStatus: 'requested' } },
        { $count: 'total' },
      ]),
      Event.aggregate([{ $match: { organizer: oid } }, { $group: { _id: null, sold: { $sum: '$soldCount' } } }]),
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

    const nextEvent = upcoming.length > 0
      ? upcoming.sort((a, b) => new Date(a.startDate) - new Date(b.startDate))[0]
      : null;

    const data = {
      counts: {
        totalEvents: events.length, upcomingEvents: upcoming.length, liveEvents: live.length,
        completedEvents: completed.length, draftEvents: drafts.length, cancelledEvents: cancelled.length,
        totalRegistrations: reg.total,
        unreadNotifications: notifCount, totalTicketsSold,
        todayCheckIns: todayBookings[0]?.total || 0, pendingRefunds: pendingRefunds[0]?.total || 0,
      },
      revenue: {
        total: pay.totalRevenue, registrations: reg.revenue,
        commission: pay.totalCommission, earnings: pay.organizerEarnings,
      },
      ratings: { average: reviewAgg[0]?.avg || 0, total: reviewAgg[0]?.total || 0 },
      nextEvent: nextEvent ? { id: nextEvent._id, title: nextEvent.title, startDate: nextEvent.startDate, venue: nextEvent.venue, poster: nextEvent.poster } : null,
    };

    await AnalyticsSnapshot.findOneAndUpdate(
      { type: 'organizer_dashboard', scope: oid.toString() },
      { type: 'organizer_dashboard', scope: oid.toString(), date: new Date(), data },
      { upsert: true }
    );
  }
};

module.exports = { runAnalyticsJob };
