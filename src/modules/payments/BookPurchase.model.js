const mongoose = require('mongoose');

const bookPurchaseSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    bookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Book',
      required: true,
    },
    amountPaid: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    gatewayOrderId: { type: String, default: '' },
    gatewayPaymentId: { type: String, default: '' },
    gatewaySignature: { type: String, default: '' },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending',
    },
    purchaseType: {
      type: String,
      enum: ['ebook', 'audiobook', 'combo'],
      default: 'ebook',
    },
  },
  { timestamps: true }
);

// Not unique — a user may retry after a failed payment
bookPurchaseSchema.index({ userId: 1, bookId: 1 });
bookPurchaseSchema.index({ gatewayPaymentId: 1 });

module.exports = mongoose.model('BookPurchase', bookPurchaseSchema);
