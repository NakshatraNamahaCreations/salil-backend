const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    totalCoins: { type: Number, default: 0 },
    availableCoins: { type: Number, default: 0 },
    usedCoins: { type: Number, default: 0 },
    bonusCoins: { type: Number, default: 0 },
    expiredCoins: { type: Number, default: 0 },
  },
  { timestamps: true }
);

walletSchema.index({ userId: 1 }, { unique: true });

module.exports = mongoose.model('Wallet', walletSchema);
