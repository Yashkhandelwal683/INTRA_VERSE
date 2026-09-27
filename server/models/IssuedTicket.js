const mongoose = require('mongoose');

const issuedTicketSchema = new mongoose.Schema({
  registration: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Registration',
    default: null,
  },
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    default: null,
  },
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
  ticketCode: {
    type: String,
    unique: true,
    required: true,
  },
  qrToken: {
    type: String,
    unique: true,
    sparse: true,
  },
  qrImage: { type: String },
  tierName: {
    type: String,
    default: 'General',
    trim: true,
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'refunded', 'failed'],
    default: 'pending',
  },
  attendeeInfo: {
    name:  { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    address: { type: String, trim: true },
  },
  entryStatus: {
    type: String,
    enum: ['unused', 'checked_in', 'checked_out', 'expired', 'cancelled'],
    default: 'unused',
  },
  entryTime:  { type: Date, default: null },
  exitTime:   { type: Date, default: null },
  checkedInBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  checkedOutBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  scanAttempts: { type: Number, default: 0 },
  scanLog: [{
    scannedAt: { type: Date },
    scannedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    ipAddress: { type: String },
    action: {
      type: String,
      enum: ['entry_attempt', 'entry_granted', 'exit_attempt', 'exit_granted', 'invalid_attempt'],
    },
    result: {
      type: String,
      enum: ['valid', 'already_used', 'expired', 'invalid', 'unpaid', 'already_checked_in', 'checked_out'],
    },
    _id: false,
  }],
}, { timestamps: true });

issuedTicketSchema.index({ booking: 1 });
issuedTicketSchema.index({ event: 1 });
issuedTicketSchema.index({ subEvent: 1 });
issuedTicketSchema.index({ user: 1 });
issuedTicketSchema.index({ event: 1, entryStatus: 1 });
issuedTicketSchema.index({ event: 1, scanAttempts: 1 });

const IssuedTicket = mongoose.model('IssuedTicket', issuedTicketSchema);
module.exports = IssuedTicket;
