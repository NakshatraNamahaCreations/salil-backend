const express = require('express');
const walletController = require('./wallet.controller');
const { authenticate, authorize } = require('../../common/auth.middleware');

// ─── Reader Wallet Routes (/api/v1/reader/wallet) ────────
const readerRouter = express.Router();

// Public — no auth required
readerRouter.get('/packs', walletController.getCoinPacks);

readerRouter.use(authenticate);
readerRouter.get('/', walletController.getWallet);
readerRouter.get('/transactions', walletController.getTransactions);
readerRouter.post('/unlock', walletController.unlockContent);
// Unlock a whole book by spending coins
readerRouter.post('/unlock-book', walletController.unlockBook);
// Buy coins via Apple In-App Purchase (verified server-side)
readerRouter.post('/verify-apple-coin-purchase', walletController.verifyAppleCoinPurchase);
// NOTE: the old POST /add-coins credited coins with no payment proof — removed.
// Coins are added only via verify-apple-coin-purchase (iOS) or admin adjustment.

// ─── Admin Wallet Routes (/api/v1/admin/wallets) ─────────
const adminRouter = express.Router();
adminRouter.use(authenticate, authorize('admin', 'superadmin'));

adminRouter.post('/:userId/adjust', walletController.adminAdjustWallet);

module.exports = { readerRouter, adminRouter };
