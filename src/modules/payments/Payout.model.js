const mongoose = require('mongoose');

const payoutSchema = new mongoose.Schema(
  {
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Author',
      required: true,
    },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    totalCoinEarnings: { type: Number, default: 0 },
    calculatedAmount: { type: Number, default: 0 },
    currency: { type: String, default: 'INR' },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
    },
    paymentMethod: { type: String, default: '' },
    transactionRef: { type: String, default: '' },
    processedAt: { type: Date },
  },
  { timestamps: true }
);

payoutSchema.index({ authorId: 1, periodStart: 1 });
payoutSchema.index({ status: 1 });

module.exports = mongoose.model('Payout', payoutSchema);
