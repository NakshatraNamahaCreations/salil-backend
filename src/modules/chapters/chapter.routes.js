const express = require('express');
const chapterController = require('./chapter.controller');
const validate = require('../../common/validate');
const { createChapterSchema, updateChapterSchema, reorderSchema, publishSchema } = require('./chapter.validators');
const { authenticate, authorize, optionalAuth, authenticateReader } = require('../../common/auth.middleware');
const uploadPdf = require('../../common/uploadPdf');
const uploadZip = require('../../common/uploadZip');

// ─── Admin Chapter Routes (/api/v1/admin/books/:bookId/chapters) ──
const adminRouter = express.Router({ mergeParams: true });

adminRouter.use(authenticate, authorize('admin', 'superadmin'));

adminRouter.post('/bulk-zip', uploadZip.single('zipFile'), chapterController.adminBulkZipUploadChapters);
adminRouter.post('/', uploadPdf.single('pdfFile'), validate(createChapterSchema), chapterController.adminCreateChapter);
adminRouter.get('/', chapterController.adminGetChapters);

// These routes use chapter ID directly (/api/v1/admin/chapters/:id)
const adminChapterRouter = express.Router();
adminChapterRouter.use(authenticate, authorize('admin', 'superadmin'));

adminChapterRouter.get('/:id', chapterController.adminGetChapter);
adminChapterRouter.put('/:id', uploadPdf.single('pdfFile'), validate(updateChapterSchema), chapterController.adminUpdateChapter);
adminChapterRouter.delete('/:id', chapterController.adminDeleteChapter);
adminChapterRouter.patch('/:id/reorder', validate(reorderSchema), chapterController.adminReorderChapter);
adminChapterRouter.patch('/:id/publish', validate(publishSchema), chapterController.adminPublishChapter);

// ─── Author Chapter Routes (/api/v1/author/books/:bookId/chapters) ──
const authorRouter = express.Router({ mergeParams: true });

authorRouter.use(authenticate, authorize('author'));

authorRouter.post('/', uploadPdf.single('pdfFile'), validate(createChapterSchema), chapterController.authorCreateChapter);
authorRouter.get('/', chapterController.authorGetChapters);

const authorChapterRouter = express.Router();
authorChapterRouter.use(authenticate, authorize('author'));
authorChapterRouter.put('/:id', uploadPdf.single('pdfFile'), validate(updateChapterSchema), chapterController.authorUpdateChapter);

// ─── Reader Chapter Routes (/api/v1/reader/books/:bookId/chapters) ──
const readerRouter = express.Router({ mergeParams: true });

readerRouter.get('/:chapterId/pdf-url', authenticateReader, chapterController.readerGetChapterPdfUrl);
readerRouter.get('/:chapterId/pdf', authenticateReader, chapterController.readerGetChapterPdf);
readerRouter.get('/:chapterId', optionalAuth, chapterController.readerGetChapterContent);

module.exports = { adminRouter, adminChapterRouter, authorRouter, authorChapterRouter, readerRouter };
