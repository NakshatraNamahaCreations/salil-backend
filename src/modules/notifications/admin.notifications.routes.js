const express = require('express');
const router = express.Router();
const ctrl = require('./admin.notifications.controller');
const { authenticate, authorize } = require('../../common/auth.middleware');

router.use(authenticate, authorize('admin', 'superadmin'));

router.get('/', ctrl.getNotifications);
router.post('/send', ctrl.sendNotification);
router.delete('/:id', ctrl.deleteNotification);

module.exports = router;
