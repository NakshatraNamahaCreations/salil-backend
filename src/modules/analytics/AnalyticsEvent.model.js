const mongoose = require('mongoose');

const analyticsEventSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['page_view', 'content_open', 'content_complete', 'search', 'unlock', 'share', 'app_open', 'session_end'],
      required: true,
    },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    contentType: { type: String, default: '' },
    contentId: { type: mongoose.Schema.Types.ObjectId },
    sessionId: { type: String, default: '' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    deviceInfo: {
      platform: { type: String, default: '' },
      version: { type: String, default: '' },
      os: { type: String, default: '' },
    },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

analyticsEventSchema.index({ type: 1, timestamp: -1 });
analyticsEventSchema.index({ userId: 1 });
analyticsEventSchema.index({ contentType: 1, contentId: 1 });
// TTL: auto-delete events older than 90 days
analyticsEventSchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

module.exports = mongoose.model('AnalyticsEvent', analyticsEventSchema);
