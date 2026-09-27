const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const Ticket = require('../models/Ticket');
const Event = require('../models/Event');
const { invalidatePattern } = require('../config/redis');

const runPaymentReconciliationJob = async () => {
  console.log('💰 [PaymentReconciliationJob] Starting reconciliation...');
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

  try {
    const stuckBookings = await Booking.find({
      status: 'pending',
      createdAt: { $lt: cutoff },
    }).lean();

    let confirmed = 0;
    let expired = 0;

    for (const booking of stuckBookings) {
      const payment = await Payment.findOne({ booking: booking._id, status: 'completed' }).lean();

      if (payment) {
        await Booking.findByIdAndUpdate(booking._id, { status: 'confirmed' });
        confirmed++;
      } else {
        const session = await require('mongoose').startSession();
        session.startTransaction();
        try {
          for (const line of booking.tickets) {
            await Ticket.findByIdAndUpdate(line.ticket, { $inc: { soldQuantity: -line.quantity } }, { session });
          }
          const totalQty = booking.tickets.reduce((s, l) => s + l.quantity, 0);
          await Event.findByIdAndUpdate(booking.event, { $inc: { soldCount: -totalQty } }, { session });
          await Booking.findByIdAndUpdate(booking._id, { status: 'cancelled' }, { session });
          await session.commitTransaction();
          expired++;
        } catch (err) {
          await session.abortTransaction();
          console.error(`💰 [PaymentReconciliationJob] Failed to expire booking ${booking._id}:`, err.message);
        } finally {
          session.endSession();
        }
      }
    }

    if (confirmed > 0 || expired > 0) {
      console.log(`💰 [PaymentReconciliationJob] Confirmed: ${confirmed}, Expired: ${expired}`);
      await invalidatePattern('admin');
      await invalidatePattern('org');
    } else {
      console.log('💰 [PaymentReconciliationJob] No stuck bookings found');
    }
  } catch (err) {
    console.error('💰 [PaymentReconciliationJob] Error:', err.message);
  }
};

module.exports = { runPaymentReconciliationJob };
