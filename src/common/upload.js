const multer = require('multer');
const multerS3 = require('multer-s3');
const { S3Client } = require('@aws-sdk/client-s3');
const config = require('../config');
const AppError = require('./AppError');

// multer-s3 v3 requires @aws-sdk/client-s3 (SDK v3) S3Client
const s3Client = new S3Client({
  credentials: {
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey,
  },
  region: config.aws.region,
});

const s3Storage = multerS3({
  s3: s3Client,
  bucket: config.aws.s3Bucket,
  metadata: function (req, file, cb) {
    cb(null, { fieldName: file.fieldname });
  },
  key: function (req, file, cb) {
    const ext = file.originalname.split('.').pop();
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `audiobooks/${uniqueSuffix}.${ext}`);
  },
});

const upload = multer({
  storage: s3Storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new AppError('Not an audio file! Please upload only audio files.', 400), false);
    }
  },
});

module.exports = upload;
module.exports.s3Client = s3Client;
