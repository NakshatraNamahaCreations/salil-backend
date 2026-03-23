const express = require('express');
const router = express.Router();
const ctrl = require('./admin.reviews.controller');
const { authenticate, authorize } = require('../../common/auth.middleware');

router.use(authenticate, authorize('admin', 'superadmin'));

router.get('/', ctrl.getReviews);
router.patch('/:id/approve', ctrl.approveReview);
router.delete('/:id', ctrl.deleteReview);

module.exports = router;
