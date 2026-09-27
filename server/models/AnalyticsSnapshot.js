const mongoose = require('mongoose');

const analyticsSnapshotSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: [
        'admin_stats',
        'admin_analytics',
        'admin_revenue',
        'organizer_overview',
        'organizer_dashboard',
        'organizer_analytics',
        'attendee_dashboard',
      ],
    },
    scope: {
      type: String,
      default: 'global',
    },
    date: {
      type: Date,
      required: true,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
  },
  { timestamps: true }
);

analyticsSnapshotSchema.index({ type: 1, scope: 1, date: -1 });
analyticsSnapshotSchema.index({ type: 1, scope: 1 }, { unique: true });

module.exports = mongoose.model('AnalyticsSnapshot', analyticsSnapshotSchema);
