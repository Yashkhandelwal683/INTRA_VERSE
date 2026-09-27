const Event = require('../models/Event');
const { invalidatePattern } = require('../config/redis');

const runEventStatusJob = async () => {
  console.log('📅 [EventStatusJob] Checking event statuses...');
  const now = new Date();

  try {
    const result = await Event.updateMany(
      { status: 'published', endDate: { $lt: now } },
      { $set: { status: 'completed' } }
    );

    if (result.modifiedCount > 0) {
      console.log(`📅 [EventStatusJob] Transitioned ${result.modifiedCount} events to completed`);
      await invalidatePattern('admin');
      await invalidatePattern('org');
      await invalidatePattern('events');
    } else {
      console.log('📅 [EventStatusJob] No events to transition');
    }
  } catch (err) {
    console.error('📅 [EventStatusJob] Error:', err.message);
  }
};

module.exports = { runEventStatusJob };
