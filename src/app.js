const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const path = require('path');

const config = require('./config');
const connectDB = require('./config/database');
const logger = require('./common/logger');
const { errorHandler } = require('./common/errorHandler');
const AppError = require('./common/AppError');

// Route imports
const authRoutes = require('./modules/auth/auth.routes');
const { adminRouter: adminBookRoutes, authorRouter: authorBookRoutes, readerRouter: readerBookRoutes } = require('./modules/books/book.routes');
const { adminRouter: adminChapterBookRoutes, adminChapterRouter, authorRouter: authorChapterBookRoutes, authorChapterRouter, readerRouter: readerChapterRoutes } = require('./modules/chapters/chapter.routes');
const { readerRouter: readerWalletRoutes, adminRouter: adminWalletRoutes } = require('./modules/wallet/wallet.routes');
const { adminRouter: adminPodcastRoutes, adminEpisodeRouter: adminPodcastEpisodeRoutes, readerRouter: readerPodcastRoutes } = require('./modules/podcasts/podcast.routes');
const { adminRouter: adminVideoRoutes, adminSeriesRouter: adminVideoSeriesRoutes, readerRouter: readerVideoRoutes } = require('./modules/videos/video.routes');
const adminUserRoutes = require('./modules/users/admin.users.routes');
const adminAuthorRoutes = require('./modules/authors/admin.authors.routes');
const adminCategoryRoutes = require('./modules/categories/admin.categories.routes');
const adminBannerRoutes = require('./modules/banners/admin.banners.routes');
const adminReviewRoutes = require('./modules/reviews/admin.reviews.routes');
const adminNotificationRoutes = require('./modules/notifications/admin.notifications.routes');
const adminCoinPackRoutes = require('./modules/wallet/admin.coinpacks.routes');
const adminDashboardRoutes = require('./modules/analytics/admin.dashboard.routes');
const adminAudiobookRoutes = require('./modules/audiobooks/audiobook.routes');
const adminPaymentRoutes = require('./modules/payments/admin.payments.routes');
const adminCouponRoutes = require('./modules/coupons/coupon.routes');
const adminReferralRoutes = require('./modules/referrals/referral.routes');
const adminUploadRoutes = require('./modules/admin/upload.routes');
const readerRoutes = require('./modules/reader/reader.routes');
const readerCouponRoutes = require('./modules/coupons/reader.coupon.routes');

const app = express();

// ─── Security Middleware ─────────────────────────────────────
app.use('/images', express.static(path.join(__dirname, '../public/images')));

app.use(helmet({
  crossOriginResourcePolicy: false,
}));
app.use(mongoSanitize());
// app.use(cors({
//   origin: (origin, callback) => {
//     // Allow requests with no origin (native mobile apps, curl, Postman)
//     if (!origin) return callback(null, true);
//     // Allow configured origins (admin panel, etc.)
//     if (config.cors.origins.includes(origin)) return callback(null, true);
//     // In development, allow all origins
//     if (config.env === 'development') return callback(null, true);
//     callback(new Error('Not allowed by CORS'));
//   },
//   credentials: true,
//   methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization'],
// }));

app.use(cors());

// ─── Rate Limiting ───────────────────────────────────────────
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: { success: false, message: 'Too many requests, please try again later', code: 'RATE_LIMIT' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { success: false, message: 'Too many login attempts, please try again later', code: 'RATE_LIMIT' },
});
app.use('/api/v1/auth', authLimiter);

// ─── Body parsing ────────────────────────────────────────────
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(compression());

// ─── Logging ─────────────────────────────────────────────────
if (config.env === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// ─── Health Check ────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Salil javeri API is running',
    environment: config.env,
    timestamp: new Date().toISOString(),
  });
});

// ─── API Routes ──────────────────────────────────────────────
app.use('/api/v1/auth', authRoutes);

// Admin Routes
app.use('/api/v1/admin/users', adminUserRoutes);
app.use('/api/v1/admin/authors', adminAuthorRoutes);
app.use('/api/v1/admin/books', adminBookRoutes);
app.use('/api/v1/admin/books/:bookId/chapters', adminChapterBookRoutes);
app.use('/api/v1/admin/chapters', adminChapterRouter);
app.use('/api/v1/admin/wallets', adminWalletRoutes);
app.use('/api/v1/admin/coin-packs', adminCoinPackRoutes);
app.use('/api/v1/admin/podcast-series', adminPodcastRoutes);
app.use('/api/v1/admin/podcast-episodes', adminPodcastEpisodeRoutes);
app.use('/api/v1/admin/videos', adminVideoRoutes);
app.use('/api/v1/admin/video-series', adminVideoSeriesRoutes);
app.use('/api/v1/admin', adminCategoryRoutes);            // /admin/categories & /admin/tags
app.use('/api/v1/admin/banners', adminBannerRoutes);
app.use('/api/v1/admin/reviews', adminReviewRoutes);
app.use('/api/v1/admin/notifications', adminNotificationRoutes);
app.use('/api/v1/admin/dashboard', adminDashboardRoutes);
app.use('/api/v1/admin/audiobooks', adminAudiobookRoutes);
app.use('/api/v1/admin/payments', adminPaymentRoutes);
app.use('/api/v1/admin/coupons', adminCouponRoutes);
app.use('/api/v1/admin/referrals', adminReferralRoutes);
app.use('/api/v1/admin/upload', adminUploadRoutes);

// Author Routes
app.use('/api/v1/author/books', authorBookRoutes);
app.use('/api/v1/author/books/:bookId/chapters', authorChapterBookRoutes);
app.use('/api/v1/author/chapters', authorChapterRouter);

// Reader Routes
app.use('/api/v1/reader', readerRoutes);                   // unified: banners, categories, search, content, library, wishlist, progress
app.use('/api/v1/reader/books', readerBookRoutes);
app.use('/api/v1/reader/books/:bookId/chapters', readerChapterRoutes);
app.use('/api/v1/reader/wallet', readerWalletRoutes);
app.use('/api/v1/reader/podcasts', readerPodcastRoutes);
app.use('/api/v1/reader/videos', readerVideoRoutes);
app.use('/api/v1/reader/coupons', readerCouponRoutes);

// ─── 404 Handler ─────────────────────────────────────────────
app.all('*', (req, res, next) => {
  next(AppError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
});

// ─── Global Error Handler ────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ────────────────────────────────────────────
const startServer = async () => {
  try {
    await connectDB();
    app.listen(config.port, () => {
      logger.info(`🚀 Salil javeri API running on port ${config.port} [${config.env}]`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
