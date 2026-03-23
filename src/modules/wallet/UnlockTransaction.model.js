const mongoose = require('mongoose');

const unlockTransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    contentType: {
      type: String,
      enum: ['chapter', 'audiobook', 'podcast_episode', 'video'],
      required: true,
    },
    contentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    coinCost: { type: Number, required: true },
    walletTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WalletTransaction',
    },
    unlockedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// One unlock per user per content item
unlockTransactionSchema.index(
  { userId: 1, contentType: 1, contentId: 1 },
  { unique: true }
);

module.exports = mongoose.model('UnlockTransaction', unlockTransactionSchema);
