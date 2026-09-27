const mongoose = require('mongoose');
const crypto = require('crypto');

const registrationSchema = new mongoose.Schema(
  {
    registrationId: {
      type: String,
      unique: true,
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: [true, 'Event reference is required'],
    },
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Organizer reference is required'],
    },
    attendee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Attendee reference is required'],
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: 1,
      default: 1,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      default: 0,
    },
    convenienceFee: {
      type: Number,
      default: 50,
    },
    discount: {
      type: Number,
      default: 0,
    },
    taxes: {
      type: Number,
      default: 0,
    },
    grandTotal: {
      type: Number,
      required: [true, 'Grand total is required'],
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      default: null,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },
    paymentMethod: {
      type: String,
      default: null,
    },
    transactionId: {
      type: String,
      default: null,
    },
    paidAt: {
      type: Date,
      default: null,
    },
    ticketStatus: {
      type: String,
      enum: ['pending_approval', 'approved', 'rejected', 'cancelled'],
      default: 'pending_approval',
    },
    attendeeDetails: {
      fullName: { type: String, required: true, trim: true },
      email: { type: String, required: true, lowercase: true, trim: true },
      phone: { type: String, required: true, trim: true },
      college: { type: String, trim: true },
      department: { type: String, trim: true },
      year: { type: String, trim: true },
      gender: { type: String, trim: true },
      emergencyContact: { type: String, trim: true },
      specialRequirements: { type: String, trim: true },
    },
    ticket: {
      ticketCode: { type: String },
      qrToken: { type: String },
      qrImage: { type: String },
      ticketId: { type: String },
    },
    registeredAt: {
      type: Date,
      default: Date.now,
    },
    registrationType: {
      type: String,
      enum: ['solo', 'team'],
      default: 'solo',
    },
    teamName: {
      type: String,
      default: null,
      trim: true,
    },
    members: [
      {
        name: { type: String, trim: true },
        email: { type: String, trim: true, lowercase: true },
        phone: { type: String, trim: true },
      },
    ],
    amountPaid: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

registrationSchema.pre('save', function (next) {
  if (!this.registrationId) {
    const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
    this.registrationId = `REG-${Date.now().toString(36).toUpperCase()}-${rand}`;
  }
  next();
});

registrationSchema.index({ event: 1 });
registrationSchema.index({ organizer: 1 });
registrationSchema.index({ attendee: 1 });
registrationSchema.index({ paymentStatus: 1 });
registrationSchema.index({ ticketStatus: 1 });

const Registration = mongoose.model('Registration', registrationSchema);
module.exports = Registration;
