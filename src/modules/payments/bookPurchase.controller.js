const crypto = require('crypto');
const Razorpay = require('razorpay');
const config = require('../../config');
const AppError = require('../../common/AppError');
const { asyncHandler } = require('../../common/errorHandler');
const Book = require('../books/Book.model');
const BookPurchase = require('./BookPurchase.model');
const Payment = require('./Payment.model');
const Coupon = require('../coupons/Coupon.model');
const { verifySignedTransaction } = require('./appleIap.service');

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

  // Build absolute callback URL for Razorpay's redirect mode.
  // Razorpay POSTs the payment result here once the user completes payment.
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers['x-forwarded-host'] || req.get('host');
  const callbackUrl = `${protocol}://${host}/api/v1/reader/books/${bookId}/payment-callback`;

  return res.json({
    success: true,
    data: {
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: config.razorpay.keyId,
      book_title: book.title,
      callback_url: callbackUrl,
      already_purchased: false,
      original_amount: originalPrice,
      discount_amount: discountAmount,
      final_amount: finalPrice,
      coupon_applied: !!appliedCoupon,
    },
  });
});

/**
 * POST /api/v1/reader/books/:bookId/payment-callback
 * PUBLIC endpoint — Razorpay's redirect target after the user completes payment.
 * Authentication: HMAC signature verification (only Razorpay knows the secret).
 *
 * Razorpay sends the payment payload as application/x-www-form-urlencoded.
 * After verifying, this endpoint marks the purchase as completed and returns
 * an HTML page that redirects to a sentinel URL the mobile WebView intercepts:
 *   https://<host>/api/v1/reader/payment-result?status=success|failure&...
 */
const paymentCallback = asyncHandler(async (req, res) => {
  const { bookId } = req.params;
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};

  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers['x-forwarded-host'] || req.get('host');
  const baseUrl = `${protocol}://${host}`;

  const renderRedirectHtml = (params) => {
    const qs = new URLSearchParams(params).toString();
    const redirectUrl = `${baseUrl}/api/v1/reader/payment-result?${qs}`;
    return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{font-family:-apple-system,system-ui,sans-serif;background:#0b0e14;color:#e2e8f0;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center;padding:24px}.box{max-width:320px}.spin{display:inline-block;width:32px;height:32px;border:3px solid #1e293b;border-top-color:#22c55e;border-radius:50%;animation:s 0.8s linear infinite;margin-bottom:16px}@keyframes s{to{transform:rotate(360deg)}}</style>
</head><body><div class="box"><div class="spin"></div><p>Finishing up...</p></div>
<script>window.location.replace(${JSON.stringify(redirectUrl)});</script>
</body></html>`;
  };

  // Missing required fields → treat as failure
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(200).type('html').send(renderRedirectHtml({
      status: 'failure',
      bookId,
      reason: 'missing_fields',
    }));
  }

  // Verify HMAC signature
  const hmac = crypto.createHmac('sha256', config.razorpay.keySecret);
  hmac.update(razorpay_order_id + '|' + razorpay_payment_id);
  const generated = hmac.digest('hex');

  if (generated !== razorpay_signature) {
    return res.status(200).type('html').send(renderRedirectHtml({
      status: 'failure',
      bookId,
      reason: 'signature_mismatch',
    }));
  }

  // Mark the purchase complete
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
    return res.status(200).type('html').send(renderRedirectHtml({
      status: 'failure',
      bookId,
      reason: 'order_not_found',
    }));
  }

  // Increment coupon usage if one was applied
  if (purchase.couponCode) {
    try {
      await Coupon.findOneAndUpdate(
        { code: purchase.couponCode },
        { $inc: { usedCount: 1 } }
      );
    } catch (e) {
      console.warn('[payment-callback] coupon increment failed', e?.message);
    }
  }

  // Audit-trail payment record (userId comes from the BookPurchase, not auth).
  try {
    await Payment.create({
      userId: purchase.userId,
      gateway: 'razorpay',
      amount: purchase.amountPaid * 100,
      currency: purchase.currency,
      status: 'captured',
      gatewayOrderId: razorpay_order_id,
      gatewayPaymentId: razorpay_payment_id,
      gatewaySignature: razorpay_signature,
      metadata: { type: 'book_purchase', bookId },
    });
  } catch (e) {
    console.warn('[payment-callback] audit payment record failed', e?.message);
  }

  return res.status(200).type('html').send(renderRedirectHtml({
    status: 'success',
    bookId,
    paymentId: razorpay_payment_id,
  }));
});

/**
 * GET /api/v1/reader/payment-result
 * Sentinel URL — the mobile WebView's onShouldStartLoadWithRequest intercepts
 * any navigation to this path, extracts the query params, and routes the host
 * app to /payment-success or /payment-failure WITHOUT loading the URL.
 * If a browser does load it (web fallback), we render a small status page.
 */
const paymentResultPage = asyncHandler(async (req, res) => {
  const { status, bookId, paymentId, reason } = req.query || {};
  const ok = status === 'success';
  return res.status(200).type('html').send(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${ok ? 'Payment Successful' : 'Payment Failed'}</title>
<style>body{font-family:-apple-system,system-ui,sans-serif;background:#0b0e14;color:#e2e8f0;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center;padding:24px}.box{max-width:340px}.icon{font-size:48px;margin-bottom:12px}h1{margin:0 0 8px;font-size:22px}p{margin:0;color:#94a3b8;font-size:14px}</style>
</head><body><div class="box"><div class="icon">${ok ? '✅' : '❌'}</div><h1>${ok ? 'Payment Successful' : 'Payment Failed'}</h1><p>${ok ? 'Please return to the app to start reading.' : `Reason: ${reason || 'unknown'}`}</p></div></body></html>`);
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
 * POST /api/v1/reader/books/:bookId/verify-apple-purchase
 * Verifies an Apple In-App Purchase (App Store guideline 3.1.1) and grants the
 * content exactly like a verified Razorpay payment.
 * Body: { purchaseType, productId, transactionId, jws }
 */
const verifyApplePurchase = asyncHandler(async (req, res) => {
  const { bookId } = req.params;
  const { purchaseType = 'ebook', productId, jws } = req.body || {};

  if (!jws || !productId) {
    throw AppError.badRequest('Missing productId or signed transaction');
  }
  if (!['ebook', 'audiobook'].includes(purchaseType)) {
    throw AppError.badRequest('Invalid purchaseType');
  }

  const book = await Book.findById(bookId).lean().catch(() => null);
  if (!book) throw AppError.notFound('Book not found');

  // Cryptographic verification: certificate chain to Apple's roots, signature,
  // bundleId and environment (production, falling back to sandbox for review builds).
  let verified;
  try {
    verified = await verifySignedTransaction(jws);
  } catch (err) {
    console.error('[apple-iap] JWS verification failed:', err?.status ?? '', err?.message ?? err);
    throw AppError.badRequest('Apple purchase verification failed');
  }
  const tx = verified.transaction;

  // The product paid for at Apple must be the product for THIS content.
  const expectedProductId =
    book.appleProductId ||
    `${purchaseType === 'audiobook' ? 'audiobook' : 'book'}_${bookId}`;
  if (tx.productId !== productId || tx.productId !== expectedProductId) {
    throw AppError.badRequest('Product does not match this content');
  }

  // A refunded/revoked transaction grants nothing.
  if (tx.revocationDate) {
    throw AppError.badRequest('This purchase has been refunded by Apple');
  }

  // Trust the transactionId inside the verified JWS, not the request body.
  const appleTransactionId = String(tx.transactionId || '');
  if (!appleTransactionId) throw AppError.badRequest('Transaction id missing');

  // Replay protection: each Apple transactionId is recorded once. Restore
  // Purchases legitimately re-sends it for the same account → success. A
  // different account presenting someone else's transaction is rejected.
  const existing = await BookPurchase.findOne({
    gateway: 'apple_iap',
    gatewayPaymentId: appleTransactionId,
    status: 'completed',
  }).lean();

  if (existing) {
    if (existing.userId.toString() !== req.userId.toString()) {
      throw AppError.conflict('This purchase belongs to a different account');
    }
    return res.json({
      success: true,
      data: { verified: true, book_id: bookId, restored: true },
    });
  }

  const originalPrice =
    (purchaseType === 'audiobook' ? book.audiobookPrice : book.ebookPrice) || 0;
  // StoreKit 2 reports price in milli-units of the storefront currency.
  const amountPaid = typeof tx.price === 'number' ? tx.price / 1000 : originalPrice;
  const currency = tx.currency || 'INR';

  await BookPurchase.findOneAndUpdate(
    { userId: req.userId, bookId, purchaseType },
    {
      status: 'completed',
      gateway: 'apple_iap',
      amountPaid,
      originalAmount: originalPrice,
      discountAmount: 0,
      couponCode: '',
      currency,
      gatewayOrderId: tx.originalTransactionId ? String(tx.originalTransactionId) : '',
      gatewayPaymentId: appleTransactionId,
      gatewaySignature: '',
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // Audit-trail payment record (mirrors the Razorpay flow).
  try {
    await Payment.create({
      userId: req.userId,
      gateway: 'apple_iap',
      amount: Math.round(amountPaid * 100),
      currency,
      status: 'captured',
      gatewayOrderId: tx.originalTransactionId ? String(tx.originalTransactionId) : '',
      gatewayPaymentId: appleTransactionId,
      metadata: {
        type: 'book_purchase',
        bookId,
        productId: tx.productId,
        environment: verified.environment,
      },
    });
  } catch (e) {
    console.warn('[apple-iap] audit payment record failed', e?.message);
  }

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

module.exports = { createOrder, verifyPayment, verifyApplePurchase, getPurchaseStatus, paymentCallback, paymentResultPage };
