const walletService = require('./wallet.service');
const { asyncHandler } = require('../../common/errorHandler');
const { success, created } = require('../../common/response');
const AppError = require('../../common/AppError');

// ─── Reader Controllers ──────────────────────────────────

const getWallet = asyncHandler(async (req, res) => {
  const wallet = await walletService.getWallet(req.userId);
  success(res, wallet);
});

const getTransactions = asyncHandler(async (req, res) => {
  const result = await walletService.getTransactions(req.userId, req.query);
  success(res, result);
});

const unlockContent = asyncHandler(async (req, res) => {
  const { contentType, contentId, coinCost } = req.body;

  if (!['chapter', 'audiobook', 'podcast_episode', 'video'].includes(contentType)) {
    throw AppError.badRequest('Invalid content type');
  }

  const result = await walletService.unlockContent(req.userId, contentType, contentId, coinCost);

  if (result.alreadyUnlocked) {
    return success(res, result, 'Content already unlocked');
  }

  success(res, result, 'Content unlocked successfully');
});

const addCoins = asyncHandler(async (req, res) => {
  const { coins, source, notes } = req.body;
  const result = await walletService.addCoins(req.userId, { coins, source, notes });
  success(res, result, `${coins} coins added to your wallet`);
});

// Buy coins via Apple In-App Purchase — verifies the signed transaction with
// Apple, then credits the pack's coins (replay-safe).
const verifyAppleCoinPurchase = asyncHandler(async (req, res) => {
  const { packId, productId, jws } = req.body;
  const result = await walletService.verifyAppleCoinPurchase(req.userId, { packId, productId, jws });
  success(res, result, result.alreadyCredited ? 'Purchase already credited' : `${result.coinsAdded} coins added`);
});

// Unlock a whole book (ebook/audiobook) by spending coins.
const unlockBook = asyncHandler(async (req, res) => {
  const { bookId, purchaseType = 'ebook', couponCode = '' } = req.body;
  if (!bookId) throw AppError.badRequest('bookId is required');
  if (!['ebook', 'audiobook'].includes(purchaseType)) {
    throw AppError.badRequest('Invalid purchaseType');
  }
  const result = await walletService.unlockBookWithCoins(req.userId, bookId, purchaseType, couponCode);
  success(res, result, result.alreadyOwned ? 'Already unlocked' : 'Book unlocked successfully');
});

// ─── Admin Controllers ───────────────────────────────────

const adminAdjustWallet = asyncHandler(async (req, res) => {
  const result = await walletService.adminAdjustWallet(req.params.userId, {
    ...req.body,
    adminId: req.userId,
  });
  success(res, result, 'Wallet adjusted successfully');
});

const CoinPack = require('./CoinPack.model');

const getCoinPacks = asyncHandler(async (req, res) => {
  const packs = await CoinPack.find({ isActive: true }).sort({ sortOrder: 1 }).lean();
  const formatted = packs.map((p) => ({
    id: p._id.toString(),
    name: p.name,
    coins: p.coins,
    bonus_coins: p.bonusCoins || 0,
    total_coins: (p.coins || 0) + (p.bonusCoins || 0),
    price_inr: p.priceINR,
    price_usd: p.priceUSD,
    is_offer: p.isOffer || false,
    offer_label: p.offerLabel || null,
    apple_product_id: p.appleProductId || `coins_${p.coins}`,
  }));
  success(res, formatted);
});

module.exports = { getWallet, getTransactions, unlockContent, addCoins, verifyAppleCoinPurchase, unlockBook, adminAdjustWallet, getCoinPacks };
