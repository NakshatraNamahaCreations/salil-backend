const express = require('express');
const router = express.Router();
const ctrl = require('./admin.banners.controller');
const { authenticate, authorize } = require('../../common/auth.middleware');
const uploadImage = require('../../common/uploadImage');

// Optional image upload — only processes multipart requests with an image field
const optionalImageUpload = (req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  if (!contentType.includes('multipart/form-data')) return next();
  uploadImage.single('image')(req, res, (err) => {
    if (err) return next(err);
    next();
  });
};

router.use(authenticate, authorize('admin', 'superadmin'));

router.get('/', ctrl.getBanners);
router.post('/', optionalImageUpload, ctrl.createBanner);
router.put('/:id', optionalImageUpload, ctrl.updateBanner);
router.patch('/:id/toggle', ctrl.toggleActive);
router.delete('/:id', ctrl.deleteBanner);

module.exports = router;
