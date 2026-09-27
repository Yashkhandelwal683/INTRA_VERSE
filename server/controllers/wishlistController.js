const Wishlist = require('../models/Wishlist');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

exports.getWishlist = async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const [items, total] = await Promise.all([
    Wishlist.find({ user: req.user.id })
      .populate('event', 'title description category poster startDate endDate location price status organizer soldCount totalCapacity')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Wishlist.countDocuments({ user: req.user.id }),
  ]);

  res.json(
    new ApiResponse(200, {
      items,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    }, 'Wishlist fetched')
  );
};

exports.addToWishlist = async (req, res) => {
  const { eventId } = req.body;
  if (!eventId) throw new ApiError(400, 'Event ID is required');

  const existing = await Wishlist.findOne({ user: req.user.id, event: eventId });
  if (existing) {
    throw new ApiError(409, 'Event already in wishlist');
  }

  const item = await Wishlist.create({ user: req.user.id, event: eventId });
  res.status(201).json(new ApiResponse(201, item, 'Added to wishlist'));
};

exports.removeFromWishlist = async (req, res) => {
  const { eventId } = req.params;
  const removed = await Wishlist.findOneAndDelete({ user: req.user.id, event: eventId });
  if (!removed) throw new ApiError(404, 'Event not in wishlist');
  res.json(new ApiResponse(200, null, 'Removed from wishlist'));
};

exports.checkWishlist = async (req, res) => {
  const { eventId } = req.params;
  const exists = await Wishlist.findOne({ user: req.user.id, event: eventId });
  res.json(new ApiResponse(200, { isWishlisted: !!exists }));
};

exports.toggleWishlist = async (req, res) => {
  const { eventId } = req.body;
  if (!eventId) throw new ApiError(400, 'Event ID is required');

  const existing = await Wishlist.findOne({ user: req.user.id, event: eventId });
  if (existing) {
    await Wishlist.findOneAndDelete({ user: req.user.id, event: eventId });
    res.json(new ApiResponse(200, { isWishlisted: false }, 'Removed from wishlist'));
  } else {
    await Wishlist.create({ user: req.user.id, event: eventId });
    res.json(new ApiResponse(200, { isWishlisted: true }, 'Added to wishlist'));
  }
};
