const express = require('express');
const router = express.Router();
const ctrl = require('./referral.controller');
const { authenticate, authorize } = require('../../common/auth.middleware');

router.use(authenticate, authorize('admin', 'superadmin'));

router.get('/', ctrl.getReferrals);
router.put('/settings', ctrl.updateSettings);
router.patch('/:id/status', ctrl.updateReferralStatus);

module.exports = router;
