const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    contentType: { type: String, required: true },
    contentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment' },
    body: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['active', 'hidden', 'reported'],
      default: 'active',
    },
  },
  { timestamps: true }
);

commentSchema.index({ contentType: 1, contentId: 1 });
commentSchema.index({ parentId: 1 });
commentSchema.index({ userId: 1 });

module.exports = mongoose.model('Comment', commentSchema);
