const crypto = require('crypto');
const Razorpay = require('razorpay');
const config = require('../../config');
const AppError = require('../../common/AppError');
const { asyncHandler } = require('../../common/errorHandler');
const Book = require('../books/Book.model');
const BookPurchase = require('./BookPurchase.model');
const Payment = require('./Payment.model');
const Coupon = require('../coupons/Coupon.model');

/**
 * POST /api/v1/reader/books/:bookId/purchase
 * Creates a Razorpay order for purchasing a book.
 */
const createOrder = asyncHandler(async (req, res) => {
  const { bookId } = req.params;

  const { purchaseType = 'ebook', couponCode } = req.body;

  const book = await Book.findById(bookId).lean();
  if (!book) throw AppError.notFound('Book not found');

  if (book.isFree) {
    throw AppError.badRequest('This content is free, no purchase needed');
  }

  const originalPrice =
    purchaseType === 'audiobook' ? book.audiobookPrice :
    purchaseType === 'combo'     ? book.comboPrice :
    book.ebookPrice;

  if (!originalPrice || originalPrice <= 0) {
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

  // ── Apply coupon if provided ──────────────────────────────
  let discountAmount = 0;
  let appliedCoupon = null;
  if (couponCode) {
    const coupon = await Coupon.findOne({ code: couponCode.toUpperCase().trim() });
    if (coupon && coupon.isActive) {
      const now = new Date();
      const validDate = (!coupon.validFrom || now >= new Date(coupon.validFrom)) &&
                        (!coupon.validUntil || now <= new Date(coupon.validUntil));
      const withinLimit = coupon.usageLimit === 0 || coupon.usedCount < coupon.usageLimit;
      const meetsMin = coupon.minPurchaseAmount === 0 || originalPrice >= coupon.minPurchaseAmount;
      const appliesToType = coupon.applicableTo === 'all' || coupon.applicableTo === purchaseType;

      if (validDate && withinLimit && meetsMin && appliesToType) {
        if (coupon.discountType === 'percentage') {
          discountAmount = (originalPrice * coupon.discountValue) / 100;
          if (coupon.maxDiscountAmount > 0) discountAmount = Math.min(discountAmount, coupon.maxDiscountAmount);
        } else {
          discountAmount = coupon.discountValue;
        }
        discountAmount = Math.min(Math.round(discountAmount * 100) / 100, originalPrice);
        appliedCoupon = coupon;
      }
    }
  }

  const finalPrice = Math.max(originalPrice - discountAmount, 0);

  if (!config.razorpay.keyId || !config.razorpay.keySecret) {
    throw AppError.badRequest('Payment gateway not configured. Please contact support.');
  }

  const razorpay = new Razorpay({
    key_id: config.razorpay.keyId,
    key_secret: config.razorpay.keySecret,
  });

  let order;
  try {
    order = await razorpay.orders.create({
      amount: Math.round(finalPrice * 100),
      currency: 'INR',
      receipt: `bk_${bookId.slice(-12)}_${Date.now().toString(36)}`,
      notes: {
        bookId: bookId.toString(),
        userId: req.userId.toString(),
        ...(appliedCoupon ? { couponCode: appliedCoupon.code } : {}),
      },
    });
  } catch (rzpErr) {
    console.error('[purchase] Razorpay error:', JSON.stringify(rzpErr));
    throw AppError.badRequest(
      rzpErr?.error?.description || rzpErr?.message || 'Failed to create payment order'
    );
  }

  // Upsert pending purchase record
  await BookPurchase.findOneAndUpdate(
    { userId: req.userId, bookId, purchaseType, status: 'pending' },
    {
      amountPaid: finalPrice,
      originalAmount: originalPrice,
      discountAmount,
      couponCode: appliedCoupon ? appliedCoupon.code : '',
      currency: 'INR',
      gatewayOrderId: order.id,
      gatewayPaymentId: '',
      gatewaySignature: '',
    },
    { upsert: true, new: true }
  );

  return res.json({
    success: true,
    data: {
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: config.razorpay.keyId,
      book_title: book.title,
      already_purchased: false,
      original_amount: originalPrice,
      discount_amount: discountAmount,
      final_amount: finalPrice,
      coupon_applied: !!appliedCoupon,
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

  // Increment coupon usage if one was applied
  if (purchase.couponCode) {
    await Coupon.findOneAndUpdate(
      { code: purchase.couponCode },
      { $inc: { usedCount: 1 } }
    );
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
