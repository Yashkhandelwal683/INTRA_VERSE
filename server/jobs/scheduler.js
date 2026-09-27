const cron = require('node-cron');
const { runAnalyticsJob } = require('./analyticsJob');
const { runEventStatusJob } = require('./eventStatusJob');
const { runPaymentReconciliationJob } = require('./paymentReconciliationJob');

const startScheduler = () => {
  console.log('⏰ Starting job scheduler...');

  cron.schedule('0 2 * * *', () => {
    console.log('⏰ [Cron] Running daily analytics job');
    runAnalyticsJob();
  });

  cron.schedule('0 */6 * * *', () => {
    console.log('⏰ [Cron] Running event status job');
    runEventStatusJob();
  });

  cron.schedule('0 * * * *', () => {
    console.log('⏰ [Cron] Running payment reconciliation job');
    runPaymentReconciliationJob();
  });

  console.log('⏰ Scheduler started — analytics: daily 2AM, events: every 6h, payments: hourly');
};

module.exports = { startScheduler };
