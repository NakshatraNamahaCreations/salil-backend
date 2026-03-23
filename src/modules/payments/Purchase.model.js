const mongoose = require('mongoose');

const purchaseSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    coinPackId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CoinPack',
      required: true,
    },
    coinsReceived: { type: Number, required: true },
    bonusCoins: { type: Number, default: 0 },
    amountPaid: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    paymentGateway: {
      type: String,
      enum: ['razorpay', 'stripe'],
      default: 'razorpay',
    },
    paymentId: { type: String, default: '' },
    paymentStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending',
    },
    promoCodeId: { type: mongoose.Schema.Types.ObjectId, ref: 'PromoCode' },
  },
  { timestamps: true }
);

purchaseSchema.index({ userId: 1, createdAt: -1 });
purchaseSchema.index({ paymentStatus: 1 });
purchaseSchema.index({ paymentId: 1 });

module.exports = mongoose.model('Purchase', purchaseSchema);
