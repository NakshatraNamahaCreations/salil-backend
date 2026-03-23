const mongoose = require('mongoose');

const readingProgressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    bookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Book',
      required: true,
    },
    chapterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chapter',
      required: true,
    },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    scrollPosition: { type: Number, default: 0 },
    lastReadAt: { type: Date, default: Date.now },
    totalReadTime: { type: Number, default: 0 }, // seconds
  },
  { timestamps: true }
);

readingProgressSchema.index({ userId: 1, bookId: 1, chapterId: 1 }, { unique: true });
readingProgressSchema.index({ userId: 1, lastReadAt: -1 });

module.exports = mongoose.model('ReadingProgress', readingProgressSchema);
