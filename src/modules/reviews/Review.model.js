const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    contentType: {
      type: String,
      enum: ['book', 'podcast_series', 'video'],
      required: true,
    },
    contentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, trim: true, default: '' },
    body: { type: String, trim: true, default: '' },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    adminReply: { type: String, default: '' },
    authorReply: { type: String, default: '' },
    isReported: { type: Boolean, default: false },
    reportReason: { type: String, default: '' },
  },
  { timestamps: true }
);

reviewSchema.index({ contentType: 1, contentId: 1 });
reviewSchema.index({ userId: 1 });
reviewSchema.index({ status: 1 });
// Ensure one review per user per content
reviewSchema.index({ userId: 1, contentType: 1, contentId: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);
