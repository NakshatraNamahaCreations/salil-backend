const express = require('express');
const router = express.Router();
const { validateCoupon } = require('./coupon.controller');
const { authenticateReader } = require('../../common/auth.middleware');

router.post('/validate', authenticateReader, validateCoupon);

module.exports = router;
