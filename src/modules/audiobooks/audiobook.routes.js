const express = require('express');
const router = express.Router();
const audiobookController = require('./audiobook.controller');
const { authenticate, authorize } = require('../../common/auth.middleware');
const upload = require('../../common/upload');
const multer = require('multer');

// Multer middleware that silently skips if no file is present (avoids S3 errors on edit-without-file)
const optionalAudioUpload = (req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  if (!contentType.includes('multipart/form-data')) {
    return next();
  }
  upload.single('audioFile')(req, res, (err) => {
    if (err) return next(err);
    next();
  });
};

router.use(authenticate, authorize('admin', 'superadmin'));

router.get('/', audiobookController.getAudiobooks);
router.post('/', upload.single('audioFile'), audiobookController.createAudiobook);
router.get('/:id', audiobookController.getAudiobook);
router.put('/:id', optionalAudioUpload, audiobookController.updateAudiobook);
router.delete('/:id', audiobookController.deleteAudiobook);
router.patch('/:id/publish', audiobookController.togglePublish);

module.exports = router;
