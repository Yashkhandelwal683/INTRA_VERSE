const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: [true, 'Event reference is required'],
    },
    type: {
      type: String,
      enum: ['general', 'vip', 'earlyBird'],
      required: [true, 'Ticket type is required'],
    },
    name: {
      type: String,
      required: [true, 'Ticket name is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    price: {
      type: Number,
      required: [true, 'Ticket price is required'],
      min: [0, 'Price cannot be negative'],
    },
    totalQuantity: {
      type: Number,
      required: [true, 'Total quantity is required'],
      min: [1, 'Total quantity must be at least 1'],
    },
    soldQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    saleStartDate: {
      type: Date,
    },
    saleEndDate: {
      type: Date,
    },
    perUserLimit: {
      type: Number,
      default: 5,
      min: [1, 'Per-user limit must be at least 1'],
    },
  },
  { timestamps: true }
);

ticketSchema.index({ event: 1 });
ticketSchema.index({ event: 1, type: 1 });

// Virtual: remaining tickets
ticketSchema.virtual('remainingQuantity').get(function () {
  return this.totalQuantity - this.soldQuantity;
});

const Ticket = mongoose.model('Ticket', ticketSchema);
module.exports = Ticket;
