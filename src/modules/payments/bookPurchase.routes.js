const express = require('express');
const router = express.Router();
const { authenticate } = require('../../common/auth.middleware');
const bookPurchaseCtrl = require('./bookPurchase.controller');

// All routes require authentication
router.post('/:bookId/purchase', authenticate, bookPurchaseCtrl.createOrder);
router.post('/:bookId/verify-payment', authenticate, bookPurchaseCtrl.verifyPayment);
router.get('/:bookId/purchase-status', authenticate, bookPurchaseCtrl.getPurchaseStatus);

module.exports = router;
