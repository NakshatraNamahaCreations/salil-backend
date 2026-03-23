const Chapter = require('./Chapter.model');
const Book = require('../books/Book.model');
const AppError = require('../../common/AppError');
const { streamPdfFromS3 } = require('../../common/signedUrl');

/**
 * Create a chapter for a book
 */
const createChapter = async (bookId, data) => {
  const book = await Book.findById(bookId);
  if (!book) throw AppError.notFound('Book not found');

  // Auto-assign order number if not provided
  if (!data.orderNumber) {
    const lastChapter = await Chapter.findOne({ bookId }).sort({ orderNumber: -1 });
    data.orderNumber = lastChapter ? lastChapter.orderNumber + 1 : 1;
  }

  // Auto-generate preview from contentHtml
  if (data.contentHtml) {
    const plainText = data.contentHtml.replace(/<[^>]*>/g, '').trim();
    data.contentPreview = plainText.substring(0, 200);
    data.wordCount = plainText.split(/\s+/).filter(Boolean).length;
    data.estimatedReadTime = Math.max(1, Math.ceil(data.wordCount / 200));
  }

  const chapter = new Chapter({ ...data, bookId });
  await chapter.save();

  // Update totalChapters count on book
  const count = await Chapter.countDocuments({ bookId });
  await Book.findByIdAndUpdate(bookId, { totalChapters: count });

  return chapter;
};

/**
 * Get all chapters for a book
 */
const getChaptersByBook = async (bookId, includeContent = false) => {
  const selectFields = includeContent
    ? ''
    : '-contentHtml -rawPdfUrl -signedPdfUrl';

  const chapters = await Chapter.find({ bookId })
    .select(selectFields)
    .sort({ orderNumber: 1 });

  return chapters;
};

/**
 * Get a single chapter by ID
 */
const getChapterById = async (chapterId, includeContent = true) => {
  const selectFields = includeContent ? '' : '-contentHtml -rawPdfUrl';

  const chapter = await Chapter.findById(chapterId).select(selectFields);
  if (!chapter) throw AppError.notFound('Chapter not found');
  return chapter;
};

/**
 * Get chapter content (for reading) — checks ownership / unlock status
 * @param {string} chapterId
 * @param {object|null} userDoc  Full Mongoose user document (or null for anonymous)
 */
const getChapterContent = async (chapterId, userDoc = null) => {
  const chapter = await Chapter.findById(chapterId);
  if (!chapter) throw AppError.notFound('Chapter not found');
  if (chapter.status !== 'published') throw AppError.notFound('Chapter not available');

  // Helper: build locked preview response
  const lockedResponse = () => ({
    chapter: {
      _id: chapter._id,
      title: chapter.title,
      orderNumber: chapter.orderNumber,
      sourceType: chapter.sourceType,
      isFree: chapter.isFree,
      coinCost: chapter.coinCost,
      contentPreview: chapter.contentPreview,
      wordCount: chapter.wordCount,
      estimatedReadTime: chapter.estimatedReadTime,
    },
    isUnlocked: false,
  });

  // Helper: build full response — never expose S3 URLs to the client
  const fullResponse = (accessReason) => {
    const chapterObj = chapter.toObject();

    // Strip the raw S3 URL — PDF is served via the backend proxy endpoint
    delete chapterObj.rawPdfUrl;
    // Flag that this chapter has PDF content (so the client knows to use the proxy)
    if (chapter.sourceType === 'pdf') {
      chapterObj.hasPdfContent = true;
    }

    return { chapter: chapterObj, isUnlocked: true, accessReason };
  };

  // ── 1. Free chapter — everyone can read ────────────────────
  if (chapter.isFree) {
    await Chapter.findByIdAndUpdate(chapterId, { $inc: { readCount: 1 } });
    return fullResponse('free');
  }

  // ── 2. No user (anonymous) — locked ────────────────────────
  if (!userDoc) return lockedResponse();

  // ── 3. Book purchased — full access to all chapters ──────
  const BookPurchase = require('../payments/BookPurchase.model');
  const purchase = await BookPurchase.findOne({
    userId: userDoc._id,
    bookId: chapter.bookId,
    status: 'completed',
  });

  if (purchase) {
    await Chapter.findByIdAndUpdate(chapterId, { $inc: { readCount: 1 } });
    return fullResponse('purchased');
  }

  // ── 4. Active premium subscription — full access ───────────
  const hasActivePlan =
    userDoc.isPremium === true &&
    (!userDoc.premiumExpiresAt || new Date(userDoc.premiumExpiresAt) > new Date());

  if (hasActivePlan) {
    await Chapter.findByIdAndUpdate(chapterId, { $inc: { readCount: 1 } });
    return fullResponse('subscription');
  }

  // ── 5. Coin-unlock transaction exists ─────────────────────
  const UnlockTransaction = require('../wallet/UnlockTransaction.model');
  const unlock = await UnlockTransaction.findOne({
    userId: userDoc._id,
    contentType: 'chapter',
    contentId: chapterId,
  });

  if (unlock) {
    await Chapter.findByIdAndUpdate(chapterId, { $inc: { readCount: 1 } });
    return fullResponse('coins');
  }

  // ── 6. Not accessible — return preview only ────────────────
  return lockedResponse();
};

/**
 * Update a chapter
 */
const updateChapter = async (chapterId, data, authorId = null) => {
  const chapter = await Chapter.findById(chapterId);
  if (!chapter) throw AppError.notFound('Chapter not found');

  // If author, verify ownership via book
  if (authorId) {
    const book = await Book.findById(chapter.bookId);
    if (!book || book.authorId.toString() !== authorId.toString()) {
      throw AppError.forbidden('You can only edit chapters in your own books');
    }
  }

  // Auto-generate preview from contentHtml
  if (data.contentHtml) {
    const plainText = data.contentHtml.replace(/<[^>]*>/g, '').trim();
    data.contentPreview = plainText.substring(0, 200);
    data.wordCount = plainText.split(/\s+/).filter(Boolean).length;
    data.estimatedReadTime = Math.max(1, Math.ceil(data.wordCount / 200));
  }

  Object.assign(chapter, data);
  await chapter.save();
  return chapter;
};

/**
 * Delete a chapter
 */
const deleteChapter = async (chapterId) => {
  const chapter = await Chapter.findById(chapterId);
  if (!chapter) throw AppError.notFound('Chapter not found');

  const bookId = chapter.bookId;
  await Chapter.findByIdAndDelete(chapterId);

  // Update count
  const count = await Chapter.countDocuments({ bookId });
  await Book.findByIdAndUpdate(bookId, { totalChapters: count });

  return { deleted: true };
};

/**
 * Reorder chapters
 */
const reorderChapter = async (chapterId, newOrder) => {
  const chapter = await Chapter.findById(chapterId);
  if (!chapter) throw AppError.notFound('Chapter not found');

  const oldOrder = chapter.orderNumber;
  const bookId = chapter.bookId;

  if (newOrder === oldOrder) return chapter;

  // Shift other chapters
  if (newOrder < oldOrder) {
    await Chapter.updateMany(
      { bookId, orderNumber: { $gte: newOrder, $lt: oldOrder } },
      { $inc: { orderNumber: 1 } }
    );
  } else {
    await Chapter.updateMany(
      { bookId, orderNumber: { $gt: oldOrder, $lte: newOrder } },
      { $inc: { orderNumber: -1 } }
    );
  }

  chapter.orderNumber = newOrder;
  await chapter.save();
  return chapter;
};

/**
 * Publish / schedule a chapter
 */
const publishChapter = async (chapterId, { status, scheduledAt }) => {
  const chapter = await Chapter.findById(chapterId);
  if (!chapter) throw AppError.notFound('Chapter not found');

  if (status === 'published') {
    chapter.status = 'published';
    chapter.publishedAt = new Date();
    chapter.scheduledAt = null;
  } else if (status === 'scheduled') {
    chapter.status = 'scheduled';
    chapter.scheduledAt = scheduledAt;
  } else if (status === 'draft') {
    chapter.status = 'draft';
    chapter.publishedAt = null;
    chapter.scheduledAt = null;
  }

  await chapter.save();
  return chapter;
};

module.exports = {
  createChapter,
  getChaptersByBook,
  getChapterById,
  getChapterContent,
  updateChapter,
  deleteChapter,
  reorderChapter,
  publishChapter,
};
