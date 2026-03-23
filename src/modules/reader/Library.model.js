const mongoose = require('mongoose');

const librarySchema = new mongoose.Schema(
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
  },
  { timestamps: true }
);

librarySchema.index({ userId: 1, contentId: 1 }, { unique: true });
librarySchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Library', librarySchema);
