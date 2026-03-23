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
    await session.abortTransaction();
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

module.exports = { unlockContent, getWallet, getTransactions, adminAdjustWallet, addCoins };
