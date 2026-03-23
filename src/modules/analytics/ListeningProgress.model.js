const mongoose = require('mongoose');

const listeningProgressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    contentType: {
      type: String,
      enum: ['audiobook', 'podcast_episode'],
      required: true,
    },
    contentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    currentPosition: { type: Number, default: 0 }, // seconds
    totalDuration: { type: Number, default: 0 },
    isCompleted: { type: Boolean, default: false },
    lastListenedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

listeningProgressSchema.index(
  { userId: 1, contentType: 1, contentId: 1 },
  { unique: true }
);
listeningProgressSchema.index({ userId: 1, lastListenedAt: -1 });

module.exports = mongoose.model('ListeningProgress', listeningProgressSchema);
