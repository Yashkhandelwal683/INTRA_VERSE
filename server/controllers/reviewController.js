const Review = require('../models/Review');
const Event = require('../models/Event');
const Booking = require('../models/Booking');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');

exports.createReview = async (req, res, next) => {
  try {
    const { eventId, subEventId, rating, title, comment } = req.body;
    const event = await Event.findById(eventId);
    if (!event) throw new ApiError(404, 'Event not found');
    const booking = await Booking.findOne({ user: req.user.id, event: eventId, status: 'confirmed' });
    if (!booking) throw new ApiError(403, 'You must have a confirmed booking to review this event');
    const existing = await Review.findOne({ user: req.user.id, event: eventId, booking: booking._id });
    if (existing) throw new ApiError(400, 'You have already reviewed this event');
    const review = await Review.create({
      event: eventId,
      subEvent: subEventId || null,
      user: req.user.id,
      booking: booking._id,
      rating, title, comment,
    });
    res.status(201).json(new ApiResponse(201, { review }));
  } catch (err) { next(err); }
};

exports.getEventReviews = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const query = { event: req.params.eventId, isVisible: true, isSpam: false };
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [reviews, total, avgResult] = await Promise.all([
      Review.find(query).populate('user', 'name avatar').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      Review.countDocuments(query),
      Review.aggregate([
        { $match: { event: require('mongoose').Types.ObjectId.createFromHexString(req.params.eventId), isVisible: true, isSpam: false } },
        { $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 } } },
      ]),
    ]);
    res.json(new ApiResponse(200, {
      reviews,
      average: avgResult[0]?.average || 0,
      total,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    }));
  } catch (err) { next(err); }
};

exports.getOrganizerReviews = async (req, res, next) => {
  try {
    const events = await Event.find({ organizer: req.user.id }).select('_id');
    const eventIds = events.map((e) => e._id);
    const reviews = await Review.find({ event: { $in: eventIds } })
      .populate('user', 'name avatar')
      .populate('event', 'title')
      .sort({ createdAt: -1 });
    const avgResult = await Review.aggregate([
      { $match: { event: { $in: eventIds }, isVisible: true, isSpam: false } },
      { $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    res.json(new ApiResponse(200, {
      reviews,
      average: avgResult[0]?.average || 0,
      total: avgResult[0]?.count || 0,
    }));
  } catch (err) { next(err); }
};

exports.replyToReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id).populate('event', 'organizer');
    if (!review) throw new ApiError(404, 'Review not found');
    if (review.event.organizer.toString() !== req.user.id && req.user.role !== 'admin') {
      throw new ApiError(403, 'Not authorized');
    }
    review.replyText = req.body.reply;
    review.repliedAt = new Date();
    review.repliedBy = req.user.id;
    await review.save();
    res.json(new ApiResponse(200, { review }));
  } catch (err) { next(err); }
};

exports.toggleReviewVisibility = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id).populate('event', 'organizer');
    if (!review) throw new ApiError(404, 'Review not found');
    if (review.event.organizer.toString() !== req.user.id && req.user.role !== 'admin') {
      throw new ApiError(403, 'Not authorized');
    }
    review.isSpam = !review.isSpam;
    review.isVisible = !review.isSpam;
    await review.save();
    res.json(new ApiResponse(200, { review }));
  } catch (err) { next(err); }
};
