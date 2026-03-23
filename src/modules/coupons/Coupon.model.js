const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: { type: String, default: '' },
    discountType: { type: String, enum: ['percentage', 'fixed'], default: 'percentage' },
    discountValue: { type: Number, required: true, min: 0 },
    minPurchaseAmount: { type: Number, default: 0, min: 0 },
    maxDiscountAmount: { type: Number, default: 0, min: 0 }, // 0 = no cap
    usageLimit: { type: Number, default: 0 }, // 0 = unlimited
    usedCount: { type: Number, default: 0 },
    validFrom: { type: Date, default: null },
    validUntil: { type: Date, default: null },
    applicableTo: {
      type: String,
      enum: ['all', 'ebook', 'audiobook', 'combo'],
      default: 'all',
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

couponSchema.index({ code: 1 });

module.exports = mongoose.model('Coupon', couponSchema);
