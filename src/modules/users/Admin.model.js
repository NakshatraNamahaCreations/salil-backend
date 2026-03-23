const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    permissions: [
      {
        type: String,
        enum: [
          'manage_users',
          'manage_authors',
          'manage_books',
          'manage_chapters',
          'manage_audiobooks',
          'manage_podcasts',
          'manage_videos',
          'manage_banners',
          'manage_wallet',
          'manage_payments',
          'manage_notifications',
          'manage_reviews',
          'manage_settings',
          'manage_analytics',
          'manage_releases',
          'manage_promos',
        ],
      },
    ],
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

adminSchema.index({ userId: 1 });

module.exports = mongoose.model('Admin', adminSchema);
