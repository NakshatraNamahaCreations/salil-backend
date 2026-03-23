const express = require('express');
const router = express.Router();
const ctrl = require('./admin.coinpacks.controller');
const { authenticate, authorize } = require('../../common/auth.middleware');

router.use(authenticate, authorize('admin', 'superadmin'));

router.get('/', ctrl.getCoinPacks);
router.post('/', ctrl.createCoinPack);
router.put('/:id', ctrl.updateCoinPack);
router.delete('/:id', ctrl.deleteCoinPack);

module.exports = router;
