const multer = require('multer');
const multerS3 = require('multer-s3');
const { S3Client } = require('@aws-sdk/client-s3');
const config = require('../config');
const AppError = require('./AppError');

const s3Client = new S3Client({
  credentials: {
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey,
  },
  region: config.aws.region,
});

const s3PdfStorage = multerS3({
  s3: s3Client,
  bucket: config.aws.s3Bucket,
  contentType: multerS3.AUTO_CONTENT_TYPE,
  contentDisposition: 'inline',
  metadata: function (req, file, cb) {
    cb(null, { fieldName: file.fieldname });
  },
  key: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `pdfs/${uniqueSuffix}.pdf`);
  },
});

const uploadPdf = multer({
  storage: s3PdfStorage,
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
