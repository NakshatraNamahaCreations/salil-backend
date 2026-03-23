const mongoose = require('mongoose');

const promoCodeSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    type: {
      type: String,
      enum: ['bonus_coins', 'discount_percent', 'discount_flat'],
      required: true,
    },
    value: { type: Number, required: true, min: 0 },
    maxUses: { type: Number, default: 0 }, // 0 = unlimited
    currentUses: { type: Number, default: 0 },
    maxUsesPerUser: { type: Number, default: 1 },
    applicableTo: {
      type: String,
      enum: ['all', 'specific_pack'],
      default: 'all',
    },
    coinPackId: { type: mongoose.Schema.Types.ObjectId, ref: 'CoinPack' },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

promoCodeSchema.index({ code: 1 }, { unique: true });
promoCodeSchema.index({ isActive: 1, startDate: 1, endDate: 1 });

module.exports = mongoose.model('PromoCode', promoCodeSchema);
