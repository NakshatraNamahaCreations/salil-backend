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

const s3ImageStorage = multerS3({
  s3: s3Client,
  bucket: config.aws.s3Bucket,
  metadata: function (req, file, cb) {
    cb(null, { fieldName: file.fieldname });
  },
  key: function (req, file, cb) {
    const ext = file.originalname.split('.').pop();
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `images/${uniqueSuffix}.${ext}`);
  },
});

const uploadImage = multer({
  storage: s3ImageStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new AppError('Not an image file! Please upload only image files.', 400), false);
    }
  },
});

module.exports = uploadImage;
