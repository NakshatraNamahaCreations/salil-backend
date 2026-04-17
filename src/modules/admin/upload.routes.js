const express = require('express');
const router = express.Router();
const multer = require('multer');
const multerS3 = require('multer-s3');
const { S3Client } = require('@aws-sdk/client-s3');
const { authenticate, authorize } = require('../../common/auth.middleware');
const { asyncHandler } = require('../../common/errorHandler');
const AppError = require('../../common/AppError');
const config = require('../../config');

router.use(authenticate, authorize('admin', 'superadmin'));

// S3 client with checksum disabled (browser-compatible)
const s3 = new S3Client({
  credentials: {
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey,
  },
  region: config.aws.region,
  requestChecksumCalculation: 'WHEN_REQUIRED',
});

const ALLOWED_MIME = [
  'application/pdf',
  'audio/mpeg', 'audio/mp3', 'audio/wav',
  'audio/ogg', 'audio/aac', 'audio/x-m4a', 'audio/mp4',
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml',
];

// Multer-S3 streams the file directly from request → S3 (never fully buffered in Node)
const fileUpload = multer({
  storage: multerS3({
    s3,
    bucket: config.aws.s3Bucket,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (req, file, cb) => {
      const ext = file.originalname.split('.').pop().toLowerCase();
      let folder = 'audiobooks';
      if (file.mimetype === 'application/pdf') folder = 'pdfs';
      else if (file.mimetype.startsWith('image/')) folder = 'images';
      cb(null, `${folder}/${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`);
    },
  }),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype) || file.mimetype.startsWith('audio/') || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new AppError('Only PDF, audio, and image files are allowed', 400), false);
    }
  },
});

/**
 * POST /api/v1/admin/upload/file
 * Multipart form-data: field "file"
 * Streams the file directly to S3 — no S3 CORS needed, no memory buffering.
 * Returns: { fileUrl }
 *
 * NOTE: Your nginx must allow large bodies for this endpoint:
 *   client_max_body_size 500M;
 */
router.post('/file', fileUpload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) throw AppError.badRequest('No file provided');
  res.json({ success: true, data: { fileUrl: req.file.location } });
}));

module.exports = router;
