const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
  },
  subEvent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubEvent',
    default: null,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true,
  },
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: 1,
    max: 5,
  },
  title:   { type: String, trim: true, maxlength: 100 },
  comment: { type: String, trim: true, maxlength: 1000 },
  isVisible: { type: Boolean, default: true },
  isSpam:    { type: Boolean, default: false },
  repliedAt:  { type: Date, default: null },
  replyText:  { type: String, trim: true, maxlength: 1000 },
  repliedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

reviewSchema.index({ event: 1, createdAt: -1 });
reviewSchema.index({ user: 1 });
reviewSchema.index({ event: 1, isVisible: 1 });
reviewSchema.index({ event: 1, rating: 1 });

const Review = mongoose.model('Review', reviewSchema);
module.exports = Review;
