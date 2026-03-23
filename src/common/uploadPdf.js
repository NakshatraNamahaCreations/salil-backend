const multer = require('multer');
const AppError = require('./AppError');

const storage = multer.memoryStorage();

const uploadPdf = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max for PDF
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new AppError('Only PDF files are allowed!', 400), false);
    }
  },
});

module.exports = uploadPdf;
