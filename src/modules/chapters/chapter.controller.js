const chapterService = require('./chapter.service');
const { asyncHandler } = require('../../common/errorHandler');
const { success, created } = require('../../common/response');

// Helper: if a PDF was uploaded to S3, set rawPdfUrl and sourceType
const processPdfIfPresent = async (req) => {
  if (req.file && req.file.location) {
    req.body.rawPdfUrl = req.file.location; // S3 URL
    req.body.sourceType = 'pdf';
  }
};

// ─── Admin Controllers ───────────────────────────────────

const adminCreateChapter = asyncHandler(async (req, res) => {
  await processPdfIfPresent(req);
  const chapter = await chapterService.createChapter(req.params.bookId, req.body);
  created(res, chapter, 'Chapter created successfully');
});

const adminGetChapters = asyncHandler(async (req, res) => {
  const chapters = await chapterService.getChaptersByBook(req.params.bookId, true);
  success(res, chapters);
});

const adminGetChapter = asyncHandler(async (req, res) => {
  const chapter = await chapterService.getChapterById(req.params.id);
  success(res, chapter);
});

const adminUpdateChapter = asyncHandler(async (req, res) => {
  await processPdfIfPresent(req);
  const chapter = await chapterService.updateChapter(req.params.id, req.body);
  success(res, chapter, 'Chapter updated successfully');
});

const adminDeleteChapter = asyncHandler(async (req, res) => {
  await chapterService.deleteChapter(req.params.id);
  success(res, null, 'Chapter deleted successfully');
});

const adminReorderChapter = asyncHandler(async (req, res) => {
  const chapter = await chapterService.reorderChapter(req.params.id, req.body.orderNumber);
  success(res, chapter, 'Chapter reordered successfully');
});

const adminPublishChapter = asyncHandler(async (req, res) => {
  const chapter = await chapterService.publishChapter(req.params.id, req.body);
  success(res, chapter, `Chapter ${req.body.status} successfully`);
});

const adminBulkZipUploadChapters = asyncHandler(async (req, res) => {
  if (!req.file) throw require('../../common/AppError').badRequest('ZIP file is required');

  const AdmZip = require('adm-zip');
  const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
  const config = require('../../config');
  const Chapter = require('./Chapter.model');

  const zip = new AdmZip(req.file.buffer);

  // Filter PDF files only, exclude macOS metadata folders, sort naturally
  const pdfEntries = zip.getEntries()
    .filter(entry =>
      !entry.isDirectory &&
      entry.entryName.toLowerCase().endsWith('.pdf') &&
      !entry.entryName.includes('__MACOSX')
    )
    .sort((a, b) => {
      const nameA = a.entryName.split('/').pop();
      const nameB = b.entryName.split('/').pop();
      return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
    });

  if (pdfEntries.length === 0) {
    throw require('../../common/AppError').badRequest('No PDF files found in the ZIP');
  }

  const s3Client = new S3Client({
    credentials: {
      accessKeyId: config.aws.accessKeyId,
      secretAccessKey: config.aws.secretAccessKey,
    },
    region: config.aws.region,
  });

  // Start order after existing chapters
  const lastChapter = await Chapter.findOne({ bookId: req.params.bookId }).sort({ orderNumber: -1 });
  let nextOrder = lastChapter ? lastChapter.orderNumber + 1 : 1;

  const results = [];
  const errors = [];

  for (const entry of pdfEntries) {
    try {
      const filename = entry.entryName.split('/').pop();
      const title = filename.replace(/\.pdf$/i, '');
      const pdfBuffer = zip.readFile(entry);

      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const s3Key = `pdfs/${uniqueSuffix}.pdf`;

      await s3Client.send(new PutObjectCommand({
        Bucket: config.aws.s3Bucket,
        Key: s3Key,
        Body: pdfBuffer,
        ContentType: 'application/pdf',
        ContentDisposition: 'inline',
      }));

      const rawPdfUrl = `https://${config.aws.s3Bucket}.s3.${config.aws.region}.amazonaws.com/${s3Key}`;

      const chapter = await chapterService.createChapter(req.params.bookId, {
        title,
        orderNumber: nextOrder++,
        sourceType: 'pdf',
        rawPdfUrl,
        status: 'published',
      });

      results.push({ title, chapterId: chapter._id });
    } catch (err) {
      errors.push({ file: entry.entryName, error: err.message });
    }
  }

  success(res, {
    uploaded: results.length,
    failed: errors.length,
    chapters: results,
    errors,
  }, `${results.length} chapter(s) uploaded from ZIP`);
});

// ─── Author Controllers ──────────────────────────────────

const authorCreateChapter = asyncHandler(async (req, res) => {
  const Author = require('../authors/Author.model');
  const Book = require('../books/Book.model');
  const AppError = require('../../common/AppError');

  const author = await Author.findOne({ userId: req.userId });
  if (!author) throw AppError.notFound('Author profile not found');

  const book = await Book.findById(req.params.bookId);
  if (!book || book.authorId.toString() !== author._id.toString()) {
    throw AppError.forbidden('You can only add chapters to your own books');
  }

  await processPdfIfPresent(req);

  const chapter = await chapterService.createChapter(req.params.bookId, req.body);
  created(res, chapter, 'Chapter created successfully');
});

const authorGetChapters = asyncHandler(async (req, res) => {
  const Author = require('../authors/Author.model');
  const Book = require('../books/Book.model');
  const AppError = require('../../common/AppError');

  const author = await Author.findOne({ userId: req.userId });
  if (!author) throw AppError.notFound('Author profile not found');

  const book = await Book.findById(req.params.bookId);
  if (!book || book.authorId.toString() !== author._id.toString()) {
    throw AppError.forbidden('You can only view chapters of your own books');
  }

  const chapters = await chapterService.getChaptersByBook(req.params.bookId);
  success(res, chapters);
});

const authorUpdateChapter = asyncHandler(async (req, res) => {
  const Author = require('../authors/Author.model');
  const author = await Author.findOne({ userId: req.userId });
  if (!author) throw require('../../common/AppError').notFound('Author profile not found');

  await processPdfIfPresent(req);

  const chapter = await chapterService.updateChapter(req.params.id, req.body, author._id);
  success(res, chapter, 'Chapter updated successfully');
});

// ─── Reader Controllers ──────────────────────────────────

const readerGetChapterContent = asyncHandler(async (req, res) => {
  const userDoc = req.user || null; // full Mongoose document (from optionalAuth)
  const data = await chapterService.getChapterContent(req.params.chapterId, userDoc);
  success(res, data);
});

// Return a short-lived presigned S3 URL — client fetches PDF directly from S3
const readerGetChapterPdfUrl = asyncHandler(async (req, res) => {
  const { getPresignedPdfUrl } = require('../../common/signedUrl');
  const AppError = require('../../common/AppError');
  const Chapter = require('./Chapter.model');

  const chapter = await Chapter.findById(req.params.chapterId);
  if (!chapter) throw AppError.notFound('Chapter not found');
  if (chapter.status !== 'published') throw AppError.notFound('Chapter not available');
  if (chapter.sourceType !== 'pdf' || !chapter.rawPdfUrl) {
    throw AppError.notFound('No PDF content for this chapter');
  }

  const userDoc = req.user || null;

  if (!chapter.isFree) {
    if (!userDoc) throw AppError.unauthorized('Authentication required');

    const BookPurchase = require('../payments/BookPurchase.model');
    const purchase = await BookPurchase.findOne({
      userId: userDoc._id,
      bookId: chapter.bookId,
      status: 'completed',
    });

    if (!purchase) {
      const hasActivePlan =
        userDoc.isPremium === true &&
        (!userDoc.premiumExpiresAt || new Date(userDoc.premiumExpiresAt) > new Date());

      if (!hasActivePlan) {
        const UnlockTransaction = require('../wallet/UnlockTransaction.model');
        const unlock = await UnlockTransaction.findOne({
          userId: userDoc._id,
          contentType: 'chapter',
          contentId: req.params.chapterId,
        });
        if (!unlock) throw AppError.forbidden('This chapter is locked');
      }
    }
  }

  const url = await getPresignedPdfUrl(chapter.rawPdfUrl);
  success(res, { url }, 'PDF URL generated');
});

// Stream PDF bytes for a chapter — accessed via ?token= (WebView / mobile)
const readerGetChapterPdf = asyncHandler(async (req, res) => {
  const { streamPdfFromS3 } = require('../../common/signedUrl');
  const AppError = require('../../common/AppError');
  const Chapter = require('./Chapter.model');

  const chapter = await Chapter.findById(req.params.chapterId);
  if (!chapter) throw AppError.notFound('Chapter not found');
  if (chapter.status !== 'published') throw AppError.notFound('Chapter not available');
  if (chapter.sourceType !== 'pdf' || !chapter.rawPdfUrl) {
    throw AppError.notFound('No PDF content for this chapter');
  }

  const userDoc = req.user || null;

  // Free chapter — anyone with a valid token can stream
  if (!chapter.isFree) {
    if (!userDoc) throw AppError.unauthorized('Authentication required');

    const BookPurchase = require('../payments/BookPurchase.model');
    const purchase = await BookPurchase.findOne({
      userId: userDoc._id,
      bookId: chapter.bookId,
      status: 'completed',
    });

    if (!purchase) {
      const hasActivePlan =
        userDoc.isPremium === true &&
        (!userDoc.premiumExpiresAt || new Date(userDoc.premiumExpiresAt) > new Date());

      if (!hasActivePlan) {
        const UnlockTransaction = require('../wallet/UnlockTransaction.model');
        const unlock = await UnlockTransaction.findOne({
          userId: userDoc._id,
          contentType: 'chapter',
          contentId: req.params.chapterId,
        });
        if (!unlock) throw AppError.forbidden('This chapter is locked');
      }
    }
  }

  await streamPdfFromS3(chapter.rawPdfUrl, req, res);
});

module.exports = {
  adminCreateChapter,
  adminGetChapters,
  adminGetChapter,
  adminUpdateChapter,
  adminDeleteChapter,
  adminReorderChapter,
  adminPublishChapter,
  adminBulkZipUploadChapters,
  authorCreateChapter,
  authorGetChapters,
  authorUpdateChapter,
  readerGetChapterContent,
  readerGetChapterPdfUrl,
  readerGetChapterPdf,
};
