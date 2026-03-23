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

module.exports = {
  adminCreateChapter,
  adminGetChapters,
  adminGetChapter,
  adminUpdateChapter,
  adminDeleteChapter,
  adminReorderChapter,
  adminPublishChapter,
  authorCreateChapter,
  authorGetChapters,
  authorUpdateChapter,
  readerGetChapterContent,
};
