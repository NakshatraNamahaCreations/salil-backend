const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true },
    imageUrl: { type: String, default: '' },
    type: {
      type: String,
      enum: ['new_chapter', 'new_episode', 'new_video', 'promo', 'low_balance', 'system', 'custom'],
      default: 'custom',
    },
    targetType: {
      type: String,
      enum: ['all', 'segment', 'individual'],
      default: 'all',
    },
    targetUserIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    linkType: { type: String, default: '' },
    linkId: { type: mongoose.Schema.Types.ObjectId },
    scheduledAt: { type: Date },
    sentAt: { type: Date },
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'sent', 'failed'],
      default: 'draft',
    },
    stats: {
      sent: { type: Number, default: 0 },
      delivered: { type: Number, default: 0 },
      opened: { type: Number, default: 0 },
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

notificationSchema.index({ status: 1, scheduledAt: 1 });
notificationSchema.index({ type: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
