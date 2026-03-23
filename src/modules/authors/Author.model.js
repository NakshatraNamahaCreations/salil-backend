const mongoose = require('mongoose');

const authorSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    displayName: { type: String, required: true, trim: true },
    bio: { type: String, default: '' },
    avatar: { type: String, default: '' },
    socialLinks: {
      website: { type: String, default: '' },
      twitter: { type: String, default: '' },
      instagram: { type: String, default: '' },
    },
    isApproved: { type: Boolean, default: false },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    contentPermissions: {
      canUploadBooks: { type: Boolean, default: true },
      canUploadPodcasts: { type: Boolean, default: false },
      canUploadVideos: { type: Boolean, default: false },
      canUseYoutubeLinks: { type: Boolean, default: false },
    },
    totalEarnings: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

authorSchema.index({ userId: 1 });
authorSchema.index({ isApproved: 1 });
authorSchema.index({ displayName: 'text' });

module.exports = mongoose.model('Author', authorSchema);
