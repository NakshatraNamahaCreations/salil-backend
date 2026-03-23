const crypto = require('crypto');
const Razorpay = require('razorpay');
const config = require('../../config');
const AppError = require('../../common/AppError');
const { asyncHandler } = require('../../common/errorHandler');
const Book = require('../books/Book.model');
const BookPurchase = require('./BookPurchase.model');
const Payment = require('./Payment.model');

/**
 * POST /api/v1/reader/books/:bookId/purchase
 * Creates a Razorpay order for purchasing a book.
 */
const createOrder = asyncHandler(async (req, res) => {
  const { bookId } = req.params;

  const purchaseType = req.body.purchaseType || 'ebook';

  const book = await Book.findById(bookId).lean();
  if (!book) throw AppError.notFound('Book not found');

  if (book.isFree) {
    throw AppError.badRequest('This content is free, no purchase needed');
  }

  const price =
    purchaseType === 'audiobook' ? book.audiobookPrice :
    purchaseType === 'combo'     ? book.comboPrice :
    book.ebookPrice;

  if (!price || price <= 0) {
    throw AppError.badRequest('Price is not set. Please contact support.');
  }

  // Check if already purchased
  const existing = await BookPurchase.findOne({
    userId: req.userId,
    bookId,
    status: 'completed',
  }).lean();

  if (existing) {
    return res.json({
      success: true,
      data: { already_purchased: true },
    });
  }

  if (!config.razorpay.keyId || !config.razorpay.keySecret) {
    throw AppError.badRequest('Payment gateway not configured. Please contact support.');
  }

  console.log('[purchase] creating Razorpay order, amount paise:', Math.round(book.ebookPrice * 100));

  const razorpay = new Razorpay({
    key_id: config.razorpay.keyId,
    key_secret: config.razorpay.keySecret,
  });

  let order;
  try {
    order = await razorpay.orders.create({
      amount: Math.round(price * 100),
      currency: 'INR',
      receipt: `bk_${bookId.slice(-12)}_${Date.now().toString(36)}`,
      notes: {
        bookId: bookId.toString(),
        userId: req.userId.toString(),
      },
    });
  } catch (rzpErr) {
    console.error('[purchase] Razorpay error:', JSON.stringify(rzpErr));
    throw AppError.badRequest(
      rzpErr?.error?.description || rzpErr?.message || 'Failed to create payment order'
    );
  }

  // Upsert pending purchase record — avoid duplicates if user taps Buy multiple times
  await BookPurchase.findOneAndUpdate(
    { userId: req.userId, bookId, purchaseType, status: 'pending' },
    { amountPaid: price, currency: 'INR', gatewayOrderId: order.id, gatewayPaymentId: '', gatewaySignature: '' },
    { upsert: true, new: true }
  );

  return res.json({
    success: true,
    data: {
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: config.razorpay.keyId || 'rzp_test_YOUR_KEY',
      book_title: book.title,
      already_purchased: false,
    },
  });
});

/**
 * POST /api/v1/reader/books/:bookId/verify-payment
 * Verifies a Razorpay payment signature and marks the purchase as completed.
 * Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
 */
const verifyPayment = asyncHandler(async (req, res) => {
  const { bookId } = req.params;
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  // Verify Razorpay signature
  const hmac = crypto.createHmac('sha256', config.razorpay.keySecret);
  hmac.update(razorpay_order_id + '|' + razorpay_payment_id);
  const generated = hmac.digest('hex');

  if (generated !== razorpay_signature) {
    throw AppError.badRequest('Payment verification failed');
  }

  // Mark purchase as completed
  const purchase = await BookPurchase.findOneAndUpdate(
    { gatewayOrderId: razorpay_order_id },
    {
      status: 'completed',
      gatewayPaymentId: razorpay_payment_id,
      gatewaySignature: razorpay_signature,
    },
    { new: true }
  );

  if (!purchase) {
    throw AppError.notFound('Purchase record not found');
  }

  // Also record a Payment entry for audit trail
  await Payment.create({
    userId: req.userId,
    gateway: 'razorpay',
    amount: purchase.amountPaid * 100,
    currency: purchase.currency,
    status: 'captured',
    gatewayOrderId: razorpay_order_id,
    gatewayPaymentId: razorpay_payment_id,
    gatewaySignature: razorpay_signature,
    metadata: { type: 'book_purchase', bookId },
  });

  return res.json({
    success: true,
    data: { verified: true, book_id: bookId },
  });
});

/**
 * GET /api/v1/reader/books/:bookId/purchase-status
 * Returns whether the authenticated user has purchased the given book.
 */
const getPurchaseStatus = asyncHandler(async (req, res) => {
  const { purchaseType } = req.query;
  const query = { userId: req.userId, bookId: req.params.bookId, status: 'completed' };
  if (purchaseType) query.purchaseType = purchaseType;

  const purchase = await BookPurchase.findOne(query).lean();

  return res.json({
    success: true,
    data: { purchased: !!purchase },
  });
});

module.exports = { createOrder, verifyPayment, getPurchaseStatus };
