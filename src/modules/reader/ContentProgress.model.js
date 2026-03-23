const mongoose = require('mongoose');

const contentProgressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    contentId: { type: String, required: true },
    contentType: {
      type: String,
      enum: ['book', 'audiobook', 'podcast', 'video'],
      required: true,
    },
    currentChapterId: { type: String, default: null },
    currentPosition: { type: Number, default: 0 }, // scroll position (books) or seconds (audio)
    totalProgress: { type: Number, default: 0, min: 0, max: 100 },
    completed: { type: Boolean, default: false },
    lastAccessedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

contentProgressSchema.index({ userId: 1, contentId: 1 }, { unique: true });
contentProgressSchema.index({ userId: 1, lastAccessedAt: -1 });

module.exports = mongoose.model('ContentProgress', contentProgressSchema);
