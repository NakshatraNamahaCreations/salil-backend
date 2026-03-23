const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    imageUrl: { type: String, required: true },
    linkType: {
      type: String,
      enum: ['book', 'podcast', 'video', 'coin_pack', 'external', 'none'],
      default: 'none',
    },
    linkId: { type: mongoose.Schema.Types.ObjectId },
    externalUrl: { type: String, default: '' },
    priority: { type: Number, default: 0 },
    targetSegment: {
      type: String,
      enum: ['all', 'new_users', 'premium_users'],
      default: 'all',
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

bannerSchema.index({ isActive: 1, startDate: 1, endDate: 1 });
bannerSchema.index({ priority: -1 });

module.exports = mongoose.model('Banner', bannerSchema);
