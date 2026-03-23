const express = require('express');
const router = express.Router();
const readerController = require('./reader.controller');
const { authenticateReader } = require('../../common/auth.middleware');
const bookPurchaseCtrl = require('../payments/bookPurchase.controller');

// ─── Public Routes ────────────────────────────────────────────
router.get('/banners', readerController.getBanners);
router.get('/categories', readerController.getCategories);
router.get('/search', readerController.searchContent);
router.get('/audiobook/:id', readerController.getAudiobookById);
router.get('/content', readerController.getContent);
router.get('/content/:id', readerController.getContentById);

// ─── Profile Routes (Authenticated) ──────────────────────────
router.get('/profile', authenticateReader, readerController.getProfile);
router.put('/profile', authenticateReader, readerController.updateProfile);
router.put('/profile/preferences', authenticateReader, readerController.updatePreferences);

// ─── Library Routes (Authenticated) ──────────────────────────
router.get('/library', authenticateReader, readerController.getLibrary);
router.post('/library/:contentId', authenticateReader, readerController.addToLibrary);
router.delete('/library/:contentId', authenticateReader, readerController.removeFromLibrary);

// ─── Wishlist Routes (Authenticated) ─────────────────────────
router.get('/wishlist', authenticateReader, readerController.getWishlist);
router.post('/wishlist/:contentId', authenticateReader, readerController.addToWishlist);
router.delete('/wishlist/:contentId', authenticateReader, readerController.removeFromWishlist);

// ─── Progress Routes (Authenticated) ─────────────────────────
router.get('/progress', authenticateReader, readerController.getProgress);
router.get('/progress/:contentId', authenticateReader, readerController.getProgressByContent);
router.post('/progress', authenticateReader, readerController.saveProgress);

// ─── Book Purchase Routes (Authenticated) ────────────────────
router.post('/books/:bookId/purchase', authenticateReader, bookPurchaseCtrl.createOrder);
router.post('/books/:bookId/verify-payment', authenticateReader, bookPurchaseCtrl.verifyPayment);
router.get('/books/:bookId/purchase-status', authenticateReader, bookPurchaseCtrl.getPurchaseStatus);

// ─── Chapter Unlock Status (Authenticated) ────────────────────
router.get('/books/:bookId/chapter-status', authenticateReader, readerController.getChapterUnlockStatus);

// ─── Reviews (Authenticated) ──────────────────────────────────
router.get('/books/:bookId/review', authenticateReader, readerController.getMyBookReview);
router.post('/books/:bookId/review', authenticateReader, readerController.submitBookReview);

// ─── Purchases (Authenticated) ────────────────────────────────
router.get('/purchases', authenticateReader, readerController.getMyPurchases);

// ─── Referrals (Authenticated) ────────────────────────────────
router.get('/referrals', authenticateReader, readerController.getMyReferrals);

module.exports = router;
