const express = require('express');
const router = express.Router();
const paymentsController = require('./admin.payments.controller');
const { authenticate, authorize } = require('../../common/auth.middleware');

router.use(authenticate);
router.use(authorize('admin', 'superadmin'));

router.get('/summary', paymentsController.getPaymentSummary);
router.get('/', paymentsController.getPayments);
router.get('/purchases', paymentsController.getPurchases);
router.get('/book-purchases', paymentsController.getBookPurchases);
router.get('/:id', paymentsController.getPaymentById);
router.patch('/:id/status', paymentsController.updatePaymentStatus);

module.exports = router;
