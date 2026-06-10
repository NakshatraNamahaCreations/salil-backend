const express = require('express');
const router = express.Router();
const { authenticate } = require('../../common/auth.middleware');
const bookPurchaseCtrl = require('./bookPurchase.controller');

// NOTE: This router is currently NOT mounted in app.js. The actual book-purchase
// routes are wired directly into reader.routes.js. Kept here for reference.

router.post('/:bookId/purchase', authenticate, bookPurchaseCtrl.createOrder);
router.post('/:bookId/verify-payment', authenticate, bookPurchaseCtrl.verifyPayment);
router.get('/:bookId/purchase-status', authenticate, bookPurchaseCtrl.getPurchaseStatus);

module.exports = router;
