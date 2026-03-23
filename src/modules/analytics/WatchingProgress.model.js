const mongoose = require('mongoose');

const watchingProgressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    videoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Video',
      required: true,
    },
    currentPosition: { type: Number, default: 0 }, // seconds
    totalDuration: { type: Number, default: 0 },
    isCompleted: { type: Boolean, default: false },
    lastWatchedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

watchingProgressSchema.index({ userId: 1, videoId: 1 }, { unique: true });
watchingProgressSchema.index({ userId: 1, lastWatchedAt: -1 });

module.exports = mongoose.model('WatchingProgress', watchingProgressSchema);
