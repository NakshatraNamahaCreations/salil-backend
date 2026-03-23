const mongoose = require('mongoose');

const coinPackSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    coins: { type: Number, required: true, min: 1 },
    bonusCoins: { type: Number, default: 0 },
    priceINR: { type: Number, required: true, min: 0 },
    priceUSD: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    isOffer: { type: Boolean, default: false },
    offerLabel: { type: String, default: '' },
    offerExpiresAt: { type: Date },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

coinPackSchema.index({ isActive: 1, sortOrder: 1 });

module.exports = mongoose.model('CoinPack', coinPackSchema);
