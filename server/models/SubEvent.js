const mongoose = require('mongoose');

const subEventSchema = new mongoose.Schema({
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: [true, 'Parent event is required'],
  },
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Organizer is required'],
  },
  title: {
    type: String,
    required: [true, 'Sub-event title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters'],
  },
  description: {
    type: String,
    required: [true, 'Sub-event description is required'],
  },
  bannerImage: { type: String, default: null },
  category: { type: String, trim: true },
  tags: [{ type: String, trim: true }],
  venue: {
    name:    { type: String, trim: true },
    address: { type: String, trim: true },
    city:    { type: String, trim: true },
    state:   { type: String, trim: true },
    country: { type: String, trim: true },
  },
  startDate: { type: Date },
  endDate:   { type: Date },
  startTime: { type: String },
  endTime:   { type: String },
  totalCapacity: { type: Number, min: 1 },
  soldCount:     { type: Number, default: 0, min: 0 },
  price: { type: Number, default: 0, min: 0 },
  status: {
    type: String,
    enum: ['draft', 'published', 'cancelled', 'completed'],
    default: 'published',
  },
  judges: [{ type: String, trim: true }],
  registrationDeadline: { type: Date },
}, { timestamps: true });

subEventSchema.index({ event: 1 });
subEventSchema.index({ organizer: 1 });

const SubEvent = mongoose.model('SubEvent', subEventSchema);
module.exports = SubEvent;
