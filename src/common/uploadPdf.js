const multer = require('multer');
const AppError = require('./AppError');

// Buffer the PDF in memory so the controller can compress it (Ghostscript)
// before uploading to S3. See common/pdfUpload.js → compressAndUploadPdf.
const uploadPdf = multer({
  storage: multer.memoryStorage(),
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
