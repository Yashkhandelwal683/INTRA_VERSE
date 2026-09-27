const mongoose = require('mongoose');

const venueSchema = new mongoose.Schema(
  {
    name:    { type: String, required: true, trim: true },
    address: { type: String, default: '', trim: true },
    city:    { type: String, default: '', trim: true },
    state:   { type: String, default: '', trim: true },
    country: { type: String, default: 'India', trim: true },
    lat:     { type: Number, default: null },
    lng:     { type: Number, default: null },
  },
  { _id: false }
);

const scheduleItemSchema = new mongoose.Schema(
  {
    time:        { type: String, default: '', trim: true },
    title:       { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
  },
  { _id: false }
);

const highlightSchema = new mongoose.Schema(
  {
    icon:        { type: String, default: 'star' },
    title:       { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
  },
  { _id: false }
);

const facilitySchema = new mongoose.Schema(
  {
    icon: { type: String, default: 'check-circle' },
    name: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const ruleSchema = new mongoose.Schema(
  {
    icon: { type: String, default: 'alert-circle' },
    text: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const faqSchema = new mongoose.Schema(
  {
    question: { type: String, required: true, trim: true },
    answer:   { type: String, required: true, trim: true },
  },
  { _id: false }
);

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Event title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      required: [true, 'Event description is required'],
    },
    shortDescription: {
      type: String,
      default: '',
      trim: true,
      maxlength: [500, 'Short description cannot exceed 500 characters'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: [
        'conference', 'concert', 'festival', 'sports',
        'workshop', 'networking', 'exhibition', 'other',
      ],
    },
    poster: {
      type: String,
      default: null,
    },
    bannerImage: {
      type: String,
      default: null,
    },
    gallery: [{ type: String }],
    location: {
      type: String,
      default: '',
    },
    venue: {
      type: venueSchema,
      default: null,
    },
    price: {
      type: Number,
      default: 0,
      min: 0,
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    registrationDeadline: {
      type: Date,
      default: null,
    },
    eventType: {
      type: String,
      enum: ['solo', 'team'],
      default: 'solo',
    },
    teamSize: {
      type: Number,
      default: null,
      min: 2,
    },
    minTeamSize: {
      type: Number,
      default: null,
      min: 1,
    },
    maxParticipants: {
      type: Number,
      default: null,
      min: 1,
    },
    visibility: {
      type: String,
      enum: ['public', 'private'],
      default: 'public',
    },
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Organizer is required'],
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'cancelled', 'completed'],
      default: 'published',
    },
    totalBookings: {
      type: Number,
      default: 0,
    },
    totalRevenue: {
      type: Number,
      default: 0,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    tags: [{ type: String, trim: true }],
    totalCapacity: {
      type: Number,
      default: null,
      min: 1,
    },
    soldCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Premium event detail fields
    schedule: [scheduleItemSchema],
    highlights: [highlightSchema],
    facilities: [facilitySchema],
    rules: [ruleSchema],
    faqs: [faqSchema],
    rating: {
      average: { type: Number, default: 0, min: 0, max: 5 },
      count: { type: Number, default: 0, min: 0 },
    },
    organizerDetails: {
      logo: { type: String, default: null },
      bio: { type: String, default: '', trim: true },
      rating: { type: Number, default: 0, min: 0, max: 5 },
      totalEvents: { type: Number, default: 0 },
      followers: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

eventSchema.index({ startDate: 1, category: 1, status: 1 });
eventSchema.index({ organizer: 1 });
eventSchema.index({ visibility: 1, status: 1 });

const Event = mongoose.model('Event', eventSchema);
module.exports = Event;
