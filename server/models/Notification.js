const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: [
      'new_booking', 'refund', 'cancellation', 'review',
      'payment_failed', 'new_registration', 'event_reminder',
      'ticket_checked_in', 'event_update',
      'organizer_approved', 'organizer_rejected',
    ],
    required: true,
  },
  title:   { type: String, required: true },
  message: { type: String, required: true },
  data: {
    bookingId:  { type: mongoose.Schema.Types.ObjectId },
    eventId:    { type: mongoose.Schema.Types.ObjectId },
    subEventId: { type: mongoose.Schema.Types.ObjectId },
    ticketId:   { type: mongoose.Schema.Types.ObjectId },
    paymentId:  { type: mongoose.Schema.Types.ObjectId },
  },
  isRead:   { type: Boolean, default: false },
  isArchived: { type: Boolean, default: false },
}, { timestamps: true });

notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, isRead: 1 });

const Notification = mongoose.model('Notification', notificationSchema);
module.exports = Notification;
