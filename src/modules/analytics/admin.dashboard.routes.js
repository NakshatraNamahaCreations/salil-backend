const express = require('express');
const router = express.Router();
const ctrl = require('./admin.dashboard.controller');
const { authenticate, authorize } = require('../../common/auth.middleware');

router.use(authenticate, authorize('admin', 'superadmin'));

router.get('/stats', ctrl.getStats);
router.get('/analytics', ctrl.getAnalytics);

module.exports = router;
