const multer = require('multer');
const AppError = require('./AppError');

const uploadZip = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB max
  fileFilter: (req, file, cb) => {
    const isZip =
      file.mimetype === 'application/zip' ||
      file.mimetype === 'application/x-zip-compressed' ||
      file.mimetype === 'application/x-zip' ||
      file.mimetype === 'application/octet-stream' ||
      file.originalname.toLowerCase().endsWith('.zip');
    if (isZip) {
      cb(null, true);
    } else {
      cb(new AppError('Only ZIP files are allowed!', 400), false);
    }
  },
});

module.exports = uploadZip;
