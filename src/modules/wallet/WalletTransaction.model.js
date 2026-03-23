const mongoose = require('mongoose');

const walletTransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['credit', 'debit'],
      required: true,
    },
    source: {
      type: String,
      enum: ['coin_pack', 'bonus', 'referral', 'unlock', 'refund', 'adjustment', 'promo', 'expiry'],
      required: true,
    },
    coins: { type: Number, required: true, min: 1 },
    balanceAfter: { type: Number, required: true },
    referenceType: { type: String, default: '' },
    referenceId: { type: mongoose.Schema.Types.ObjectId },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

walletTransactionSchema.index({ userId: 1, createdAt: -1 });
walletTransactionSchema.index({ source: 1 });
walletTransactionSchema.index({ referenceType: 1, referenceId: 1 });

module.exports = mongoose.model('WalletTransaction', walletTransactionSchema);
