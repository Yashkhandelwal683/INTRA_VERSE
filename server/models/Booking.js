const mongoose = require('mongoose');

const ticketLineSchema = new mongoose.Schema(
  {
    ticket:    { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket', required: true },
    quantity:  { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const attendeeInfoSchema = new mongoose.Schema(
  {
    name:  { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
  },
  { _id: false }
);

const bookingSchema = new mongoose.Schema(
  {
    bookingRef: {
      type: String,
      unique: true,
      uppercase: true,
      // Auto-generated in pre-validate hook below
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: [true, 'Event reference is required'],
    },
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    tickets: {
      type: [ticketLineSchema],
      validate: {
        validator: (v) => v.length > 0,
        message: 'At least one ticket line is required',
      },
    },
    totalAmount: {
      type: Number,
      required: [true, 'Total amount is required'],
      min: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'refunded'],
      default: 'pending',
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      default: null,
    },
    qrCode: {
      type: String, // base64 PNG data URL
      default: null,
    },
    attendeeInfo: {
      type: attendeeInfoSchema,
      default: {},
    },

    // ── Cancellation & Refund Fields ────────────────────────────────────────────
    cancellationStatus: {
      type: String,
      enum: ['none', 'requested', 'approved', 'rejected'],
      default: 'none',
    },
    cancellationRequestedAt: { type: Date, default: null },
    cancellationReason:      { type: String, default: '' },
    cancellationApprovedAt:  { type: Date, default: null },
    cancellationApprovedBy:  {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    refundAmount:  { type: Number, default: 0 },
    refundPercent: { type: Number, default: 0 },
    refundStatus: {
      type: String,
      enum: ['none', 'pending', 'processed'],
      default: 'none',
    },
    refundInitiatedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
bookingSchema.index({ user: 1, createdAt: -1 });
bookingSchema.index({ event: 1 });
bookingSchema.index({ organizer: 1 });

// ── Helpers for human-readable booking reference ──────────────────────────────
const Event = mongoose.model('Event');
const User  = mongoose.model('User');

const STOP_WORDS = new Set(['the', 'a', 'an', 'of', 'and', 'or', 'for', 'in', 'on', 'at', 'to']);

function abbreviateName(name, maxLen = 5) {
  if (!name) return 'EVT';
  const words = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 0 && !STOP_WORDS.has(w.toLowerCase()));
  if (words.length === 0) return 'EVT';
  if (words.length === 1) return words[0].slice(0, maxLen);
  return words[0].slice(0, 3) + words[1].slice(0, 2);
}

function abbreviateOrg(name, maxLen = 3) {
  if (!name) return 'UNI';
  return name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 0 && !STOP_WORDS.includes(w.toLowerCase()))
    .map((w) => w[0])
    .join('')
    .slice(0, maxLen) || 'UNI';
}

// ── Auto-generate human-readable booking reference ────────────────────────────
// Format: EVENTORGEVENTS-0001  (e.g. MUDRAGLA-EVENTS-0001)
bookingSchema.pre('validate', async function (next) {
  if (this.bookingRef) return next();

  try {
    let eventTitle = '';
    let orgName = '';

    if (this.event) {
      const EventModel = mongoose.model('Event');
      const eventDoc = await EventModel.findById(this.event).select('title organizer').lean();
      if (eventDoc) {
        eventTitle = eventDoc.title || '';
        if (eventDoc.organizer) {
          const UserDoc = mongoose.model('User');
          const orgDoc = await UserDoc.findById(eventDoc.organizer).select('organizationName').lean();
          orgName = orgDoc?.organizationName || '';
        }
      }
    }

    const eventAbbr = abbreviateName(eventTitle, 5);
    const orgAbbr   = abbreviateOrg(orgName, 3);
    const prefix    = `${eventAbbr}${orgAbbr}-EVENTS`;

    const Booking = mongoose.model('Booking');
    const lastBooking = await Booking
      .findOne({ bookingRef: { $regex: `^${prefix}-\\d{4}$` } })
      .sort({ bookingRef: -1 })
      .lean();

    let seq = 1;
    if (lastBooking?.bookingRef) {
      const lastNum = parseInt(lastBooking.bookingRef.split('-').pop(), 10);
      if (!isNaN(lastNum)) seq = lastNum + 1;
    }

    this.bookingRef = `${prefix}-${String(seq).padStart(4, '0')}`;
  } catch (err) {
    // Fallback to random ref if something goes wrong
    const crypto = require('crypto');
    this.bookingRef = 'BK-' + crypto.randomBytes(4).toString('hex').toUpperCase();
  }

  next();
});

const Booking = mongoose.model('Booking', bookingSchema);
module.exports = Booking;
