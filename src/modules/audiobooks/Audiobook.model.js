const mongoose = require('mongoose');

const audiobookSchema = new mongoose.Schema(
  {
    bookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Book',
      required: true,
    },
    chapterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chapter',
    },
    orderNumber: { type: Number, default: 1 },
    title: { type: String, required: true, trim: true },
    audioUrl: { type: String, default: '' }, // S3 key
    duration: { type: Number, default: 0 }, // seconds
    narrator: { type: String, default: '' },
    listenCount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
    },
  },
  { timestamps: true }
);

audiobookSchema.index({ bookId: 1 });
audiobookSchema.index({ chapterId: 1 });

module.exports = mongoose.model('Audiobook', audiobookSchema);
