const express = require('express');
const router = express.Router();
const ctrl = require('./coupon.controller');
const { authenticate, authorize } = require('../../common/auth.middleware');

router.use(authenticate, authorize('admin', 'superadmin'));

router.get('/', ctrl.getCoupons);
router.post('/', ctrl.createCoupon);
router.get('/:id/usages', ctrl.getCouponUsages);
router.put('/:id', ctrl.updateCoupon);
router.patch('/:id/toggle', ctrl.toggleCoupon);
router.delete('/:id', ctrl.deleteCoupon);

module.exports = router;
