const mongoose = require('mongoose');
const Wallet = require('./Wallet.model');
const WalletTransaction = require('./WalletTransaction.model');
const UnlockTransaction = require('./UnlockTransaction.model');
const AppError = require('../../common/AppError');

/**
 * Unlock premium content by spending coins (atomic transaction)
 */
const unlockContent = async (userId, contentType, contentId, coinCost) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const wallet = await Wallet.findOne({ userId }).session(session);
    if (!wallet) throw AppError.notFound('Wallet not found');

    // Check if already unlocked
    const existing = await UnlockTransaction.findOne({
      userId, contentType, contentId,
    }).session(session);
    if (existing) {
      await session.abortTransaction();
      return { alreadyUnlocked: true, unlock: existing };
    }

    // Check sufficient balance
    if (wallet.availableCoins < coinCost) {
      await session.abortTransaction();
      throw AppError.badRequest(
        `Insufficient coins. You need ${coinCost} coins but have ${wallet.availableCoins}.`
      );
    }

    // Deduct coins
    wallet.availableCoins -= coinCost;
    wallet.usedCoins += coinCost;
    await wallet.save({ session });

    // Create wallet transaction (debit)
    const walletTxn = await WalletTransaction.create([{
      userId,
      type: 'debit',
      source: 'unlock',
      coins: coinCost,
      balanceAfter: wallet.availableCoins,
      referenceType: contentType,
      referenceId: contentId,
      notes: `Unlocked ${contentType}: ${contentId}`,
    }], { session });

    // Create unlock record
    const unlock = await UnlockTransaction.create([{
      userId,
      contentType,
      contentId,
      coinCost,
      walletTransactionId: walletTxn[0]._id,
      unlockedAt: new Date(),
    }], { session });

    await session.commitTransaction();
    return { alreadyUnlocked: false, unlock: unlock[0], wallet };
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Get wallet balance
 */
const getWallet = async (userId) => {
  let wallet = await Wallet.findOne({ userId });
  if (!wallet) {
    wallet = await Wallet.create({ userId, availableCoins: 0, totalCoins: 0, usedCoins: 0 });
  }
  return wallet;
};

/**
 * Get transaction history
 */
const getTransactions = async (userId, { page = 1, limit = 20 }) => {
  const skip = (page - 1) * limit;

  const [transactions, total] = await Promise.all([
    WalletTransaction.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    WalletTransaction.countDocuments({ userId }),
  ]);

  return {
    transactions,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
};

/**
 * Admin: manual coin adjustment
 */
const adminAdjustWallet = async (userId, { type, coins, notes, adminId }) => {
  const wallet = await Wallet.findOne({ userId });
  if (!wallet) throw AppError.notFound('Wallet not found');

  if (type === 'credit') {
    wallet.availableCoins += coins;
    wallet.totalCoins += coins;
  } else if (type === 'debit') {
    if (wallet.availableCoins < coins) {
      throw AppError.badRequest('Insufficient coins for debit adjustment');
    }
    wallet.availableCoins -= coins;
    wallet.usedCoins += coins;
  }

  await wallet.save();

  const txn = await WalletTransaction.create({
    userId,
    type,
    source: 'adjustment',
    coins,
    balanceAfter: wallet.availableCoins,
    notes: `Admin adjustment: ${notes}`,
  });

  return { wallet, transaction: txn };
};

/**
 * Add coins to user wallet (after payment verification)
 * For MVP: directly credits coins. In production, verify payment before calling this.
 */
const addCoins = async (userId, { coins, source = 'coin_pack', notes = '' }) => {
  let wallet = await Wallet.findOne({ userId });
  if (!wallet) {
    wallet = await Wallet.create({ userId, availableCoins: 0, totalCoins: 0, usedCoins: 0 });
  }

  if (!coins || coins <= 0) {
    throw AppError.badRequest('Invalid coin amount');
  }

  wallet.availableCoins += coins;
  wallet.totalCoins += coins;
  await wallet.save();

  const txn = await WalletTransaction.create({
    userId,
    type: 'credit',
    source,
    coins,
    balanceAfter: wallet.availableCoins,
    notes: notes || `Added ${coins} coins`,
  });

  return { wallet, transaction: txn };
};

/**
 * Credit coins after a verified Apple In-App Purchase of a coin pack.
 * The Apple transaction (JWS) is cryptographically verified, the product is
 * matched to a CoinPack, and the same Apple transactionId is credited only once
 * (replay-safe). Consumable purchases — a user can buy the same pack repeatedly,
 * but each Apple transaction credits coins exactly once.
 */
const verifyAppleCoinPurchase = async (userId, { packId, productId, jws }) => {
  const CoinPack = require('./CoinPack.model');
  const Payment = require('../payments/Payment.model');
  const { verifySignedTransaction } = require('../payments/appleIap.service');

  if (!jws || !productId) throw AppError.badRequest('Missing productId or signed transaction');

  // Resolve the pack: prefer an explicit id, else match the Apple product id
  // (explicit appleProductId on the pack, or the convention coins_<coins>).
  let pack = null;
  if (packId) pack = await CoinPack.findById(packId).catch(() => null);
  if (!pack) {
    pack = await CoinPack.findOne({ appleProductId: productId });
  }
  if (!pack) {
    const packs = await CoinPack.find({ isActive: true });
    pack = packs.find((p) => (p.appleProductId || `coins_${p.coins}`) === productId) || null;
  }
  if (!pack) throw AppError.notFound('Coin pack not found for this product');

  const expectedProductId = pack.appleProductId || `coins_${pack.coins}`;
  if (productId !== expectedProductId) {
    throw AppError.badRequest('Product does not match this coin pack');
  }

  // Cryptographic verification with Apple (production, then sandbox).
  let verified;
  try {
    verified = await verifySignedTransaction(jws);
  } catch (err) {
    console.error('[apple-coin] JWS verification failed:', err?.status ?? '', err?.message ?? err);
    throw AppError.badRequest('Apple purchase verification failed');
  }
  const tx = verified.transaction;
  if (tx.productId !== expectedProductId) {
    throw AppError.badRequest('Verified product does not match the coin pack');
  }
  if (tx.revocationDate) throw AppError.badRequest('This purchase has been refunded by Apple');

  const appleTransactionId = String(tx.transactionId || '');
  if (!appleTransactionId) throw AppError.badRequest('Transaction id missing');

  // Replay protection: each Apple transactionId credits coins exactly once.
  const existing = await Payment.findOne({
    gateway: 'apple_iap',
    gatewayPaymentId: appleTransactionId,
    'metadata.type': 'coin_pack',
  }).lean();
  if (existing) {
    if (existing.userId.toString() !== userId.toString()) {
      throw AppError.conflict('This purchase belongs to a different account');
    }
    const wallet = await getWallet(userId);
    return { wallet, coinsAdded: 0, alreadyCredited: true };
  }

  const coinsToCredit = (pack.coins || 0) + (pack.bonusCoins || 0);

  // Credit atomically.
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    let wallet = await Wallet.findOne({ userId }).session(session);
    if (!wallet) {
      wallet = (await Wallet.create([{ userId }], { session }))[0];
    }
    wallet.availableCoins += coinsToCredit;
    wallet.totalCoins += coinsToCredit;
    if (pack.bonusCoins) wallet.bonusCoins += pack.bonusCoins;
    await wallet.save({ session });

    await WalletTransaction.create([{
      userId,
      type: 'credit',
      source: 'coin_pack',
      coins: coinsToCredit,
      balanceAfter: wallet.availableCoins,
      referenceType: 'coin_pack',
      referenceId: pack._id,
      notes: `Purchased ${pack.name} (Apple IAP)`,
    }], { session });

    await Payment.create([{
      userId,
      gateway: 'apple_iap',
      amount: Math.round((pack.priceINR || 0) * 100),
      currency: tx.currency || 'INR',
      status: 'captured',
      gatewayPaymentId: appleTransactionId,
      gatewayOrderId: tx.originalTransactionId ? String(tx.originalTransactionId) : '',
      metadata: { type: 'coin_pack', packId: pack._id.toString(), productId: expectedProductId, coins: coinsToCredit, environment: verified.environment },
    }], { session });

    await session.commitTransaction();
    return { wallet, coinsAdded: coinsToCredit, alreadyCredited: false };
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Unlock a whole book (ebook or audiobook) by spending coins. Creates a
 * completed BookPurchase (gateway 'coins') so every existing access check —
 * chapter reading, PDF streaming, purchase-status, /purchases — works unchanged.
 * The coin cost is derived server-side from the book price (1 coin = ₹1).
 */
const unlockBookWithCoins = async (userId, bookId, purchaseType = 'ebook', couponCode = '') => {
  const Book = require('../books/Book.model');
  const BookPurchase = require('../payments/BookPurchase.model');
  const Coupon = require('../coupons/Coupon.model');

  const book = await Book.findById(bookId).lean().catch(() => null);
  if (!book) throw AppError.notFound('Book not found');
  if (book.isFree) throw AppError.badRequest('This content is free, no unlock needed');

  const originalCost =
    (purchaseType === 'audiobook' ? book.audiobookPrice : book.ebookPrice) || 0;
  if (!originalCost || originalCost <= 0) throw AppError.badRequest('Coin price is not set for this content');

  // Coupons discount the coin cost (1 coin = ₹1). This stays within Apple's
  // rules on iOS because the coins themselves were bought via Apple IAP — the
  // coupon never routes payment outside the App Store. Same eligibility rules
  // as the Razorpay flow in bookPurchase.controller.js.
  let coinCost = originalCost;
  let appliedCoupon = null;
  if (couponCode) {
    const coupon = await Coupon.findOne({ code: String(couponCode).toUpperCase().trim() });
    if (coupon && coupon.isActive) {
      const now = new Date();
      const validDate = (!coupon.validFrom || now >= new Date(coupon.validFrom)) &&
                        (!coupon.validUntil || now <= new Date(coupon.validUntil));
      const withinLimit = coupon.usageLimit === 0 || coupon.usedCount < coupon.usageLimit;
      const meetsMin = coupon.minPurchaseAmount === 0 || originalCost >= coupon.minPurchaseAmount;
      const appliesToType = coupon.applicableTo === 'all' || coupon.applicableTo === purchaseType;
      if (validDate && withinLimit && meetsMin && appliesToType) {
        let discount = coupon.discountType === 'percentage'
          ? (originalCost * coupon.discountValue) / 100
          : coupon.discountValue;
        if (coupon.discountType === 'percentage' && coupon.maxDiscountAmount > 0) {
          discount = Math.min(discount, coupon.maxDiscountAmount);
        }
        coinCost = Math.max(0, Math.round(originalCost - discount));
        appliedCoupon = coupon;
      }
    }
  }

  // Already owned (via any gateway)?
  const existing = await BookPurchase.findOne({
    userId, bookId, purchaseType, status: 'completed',
  }).lean();
  if (existing) return { alreadyOwned: true };

  // Ensure the wallet exists (a 100%-off coupon must work for a user who has
  // never bought coins).
  await getWallet(userId);

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const wallet = await Wallet.findOne({ userId }).session(session);
    if (!wallet || wallet.availableCoins < coinCost) {
      // Let the catch block handle the abort (avoids a double-abort).
      throw AppError.badRequest(
        `Insufficient coins. You need ${coinCost} coins but have ${wallet ? wallet.availableCoins : 0}.`
      );
    }

    // A 100%-off coupon leaves nothing to debit — WalletTransaction requires
    // coins >= 1, so skip the debit entirely for a free unlock.
    let gatewayPaymentId;
    if (coinCost > 0) {
      wallet.availableCoins -= coinCost;
      wallet.usedCoins += coinCost;
      await wallet.save({ session });

      const walletTxn = await WalletTransaction.create([{
        userId,
        type: 'debit',
        source: 'unlock',
        coins: coinCost,
        balanceAfter: wallet.availableCoins,
        referenceType: 'book',
        referenceId: bookId,
        notes: `Unlocked ${purchaseType}: ${book.title}${appliedCoupon ? ` (coupon ${appliedCoupon.code})` : ''}`,
      }], { session });
      gatewayPaymentId = walletTxn[0]._id.toString();
    } else {
      gatewayPaymentId = `coupon:${appliedCoupon ? appliedCoupon.code : 'free'}:${new mongoose.Types.ObjectId().toString()}`;
    }

    const purchase = await BookPurchase.create([{
      userId,
      bookId,
      purchaseType,
      status: 'completed',
      gateway: 'coins',
      amountPaid: coinCost,
      originalAmount: originalCost,
      discountAmount: originalCost - coinCost,
      couponCode: appliedCoupon ? appliedCoupon.code : '',
      currency: 'COINS',
      gatewayPaymentId,
    }], { session });

    await session.commitTransaction();

    // Consume the coupon only after a successful unlock (mirrors the Razorpay
    // flow, which increments on payment verification).
    if (appliedCoupon) {
      await Coupon.updateOne({ _id: appliedCoupon._id }, { $inc: { usedCount: 1 } }).catch(() => {});
    }

    return { alreadyOwned: false, wallet, purchase: purchase[0] };
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

module.exports = { unlockContent, getWallet, getTransactions, adminAdjustWallet, addCoins, verifyAppleCoinPurchase, unlockBookWithCoins };
