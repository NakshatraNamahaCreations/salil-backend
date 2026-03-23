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
readerRouter.post('/add-coins', walletController.addCoins);

// ─── Admin Wallet Routes (/api/v1/admin/wallets) ─────────
const adminRouter = express.Router();
adminRouter.use(authenticate, authorize('admin', 'superadmin'));

adminRouter.post('/:userId/adjust', walletController.adminAdjustWallet);

module.exports = { readerRouter, adminRouter };
