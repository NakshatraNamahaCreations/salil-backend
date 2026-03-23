const bookService = require('./book.service');
const { asyncHandler } = require('../../common/errorHandler');
const { success, created, paginated } = require('../../common/response');

// ─── Admin Controllers ───────────────────────────────────

const buildBookData = (body, file) => {
  const data = { ...body };
  if (file?.location) data.coverImage = file.location;
  if (typeof data.genres === 'string') {
    try { data.genres = JSON.parse(data.genres); } catch { data.genres = []; }
  }
  // Parse FormData string values to proper types
  if (typeof data.isFree === 'string') data.isFree = data.isFree === 'true';
  if (typeof data.ebookPrice === 'string') data.ebookPrice = Number(data.ebookPrice) || 0;
  if (typeof data.audiobookPrice === 'string') data.audiobookPrice = Number(data.audiobookPrice) || 0;
  if (typeof data.comboPrice === 'string') data.comboPrice = Number(data.comboPrice) || 0;
  if (data.contentType && !['ebook', 'audiobook'].includes(data.contentType)) delete data.contentType;
  return data;
};

const adminCreateBook = asyncHandler(async (req, res) => {
  const data = buildBookData(req.body, req.file);
  const book = await bookService.createBook(data, data.authorId);
  created(res, book, 'Book created successfully');
});

const adminGetBooks = asyncHandler(async (req, res) => {
  const result = await bookService.getBooks(req.query);

  return res.status(200).json({
    success: true,
    books: result.books,
    pagination: result.pagination,
  });
});

const adminGetBook = asyncHandler(async (req, res) => {
  const book = await bookService.getBookById(req.params.id);
  success(res, book);
});

const adminUpdateBook = asyncHandler(async (req, res) => {
  const data = buildBookData(req.body, req.file);
  const book = await bookService.updateBook(req.params.id, data);
  success(res, book, 'Book updated successfully');
});

const adminDeleteBook = asyncHandler(async (req, res) => {
  await bookService.deleteBook(req.params.id);
  success(res, null, 'Book and chapters deleted permanently');
});

const adminToggleFeatured = asyncHandler(async (req, res) => {
  const book = await bookService.toggleFeatured(req.params.id);
  success(res, book, `Book ${book.isFeatured ? 'featured' : 'unfeatured'} successfully`);
});

// ─── Author Controllers ──────────────────────────────────

const authorCreateBook = asyncHandler(async (req, res) => {
  // Find author record from userId
  const Author = require('../authors/Author.model');
  const author = await Author.findOne({ userId: req.userId });
  if (!author) throw require('../../common/AppError').notFound('Author profile not found');

  const data = buildBookData(req.body, req.file);
  const book = await bookService.createBook(data, author._id);
  created(res, book, 'Book created successfully');
});

const authorGetBooks = asyncHandler(async (req, res) => {
  const Author = require('../authors/Author.model');
  const author = await Author.findOne({ userId: req.userId });
  if (!author) throw require('../../common/AppError').notFound('Author profile not found');

  const result = await bookService.getBooks({ ...req.query, authorId: author._id });
  paginated(res, result.books, result.pagination);
});

const authorUpdateBook = asyncHandler(async (req, res) => {
  const Author = require('../authors/Author.model');
  const author = await Author.findOne({ userId: req.userId });
  if (!author) throw require('../../common/AppError').notFound('Author profile not found');

  const data = buildBookData(req.body, req.file);
  const book = await bookService.updateBook(req.params.id, data, author._id);
  success(res, book, 'Book updated successfully');
});

// ─── Public Controllers ──────────────────────────────────

const getBookBySlug = asyncHandler(async (req, res) => {
  const data = await bookService.getBookBySlug(req.params.slug);
  success(res, data);
});

const getPublicBooks = asyncHandler(async (req, res) => {
  const result = await bookService.getBooks({
    ...req.query,
    status: 'published',
  });
  paginated(res, result.books, result.pagination);
});

module.exports = {
  adminCreateBook,
  adminGetBooks,
  adminGetBook,
  adminUpdateBook,
  adminDeleteBook,
  adminToggleFeatured,
  authorCreateBook,
  authorGetBooks,
  authorUpdateBook,
  getBookBySlug,
  getPublicBooks,
};
