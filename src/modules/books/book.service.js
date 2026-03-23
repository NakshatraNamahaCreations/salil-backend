const Book = require('./Book.model');
const Chapter = require('../chapters/Chapter.model');
const AppError = require('../../common/AppError');
const slugify = require('slugify');

/**
 * Create a new book
 */
const generateSlug = (title) => {
  let slug = slugify(title, { lower: true, strict: true, trim: true });
  // If slugify produces empty string (non-latin scripts), use a fallback
  if (!slug) slug = 'book';
  return slug + '-' + Date.now().toString(36);
};

const createBook = async (data, authorId = null) => {
  const slug = generateSlug(data.title);

  const bookData = { ...data, slug };
  if (authorId) bookData.authorId = authorId;

  const book = new Book(bookData);
  await book.save();
  return book;
};

/**
 * Get all books with filters and pagination
 */
const getBooks = async ({
  page = 1,
  limit = 20,
  search,
  status,
  authorId,
  categoryId,
  contentType,
  bookLanguage,
  isFeatured,
  sortBy = 'createdAt',
  sortOrder = 'desc',
}) => {
const query = {};

if (search) {
  query.$or = [
    { title: { $regex: search, $options: 'i' } },
    { description: { $regex: search, $options: 'i' } },
  ];
}
if (status) query.status = status;
if (authorId) query.authorId = authorId;
if (categoryId) query.categoryId = categoryId;
if (contentType) {
  // Legacy ebook docs may not have contentType set — treat missing field as 'ebook'
  query.contentType = contentType === 'ebook' ? { $in: ['ebook', null] } : contentType;
}
if (bookLanguage) query.bookLanguage = bookLanguage;
if (isFeatured !== undefined) query.isFeatured = isFeatured;

  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
  const skip = (page - 1) * limit;

  const [books, total] = await Promise.all([
    Book.find(query)
      .populate('authorId', 'displayName avatar')
      .populate('categoryId', 'name slug')
      .populate('tags', 'name slug')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Book.countDocuments(query),
  ]);

 

  return {
    books,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get a single book by ID
 */
const getBookById = async (bookId) => {
  const book = await Book.findById(bookId)
    .populate('authorId', 'displayName avatar bio')
    .populate('categoryId', 'name slug')
    .populate('tags', 'name slug');

  if (!book) throw AppError.notFound('Book not found');
  return book;
};

/**
 * Get book by slug (public)
 */
const getBookBySlug = async (slug) => {
  const book = await Book.findOne({ slug })
    .populate('authorId', 'displayName avatar bio')
    .populate('categoryId', 'name slug')
    .populate('tags', 'name slug');

  if (!book) throw AppError.notFound('Book not found');

  // Get chapters list
  const chapters = await Chapter.find({ bookId: book._id })
    .select('title orderNumber isFree coinCost status publishedAt wordCount estimatedReadTime')
    .sort({ orderNumber: 1 });

  return { book, chapters };
};

/**
 * Update a book
 */
const updateBook = async (bookId, data, authorId = null) => {
  const book = await Book.findById(bookId);
  if (!book) throw AppError.notFound('Book not found');

  // If an author is updating, verify ownership
  if (authorId && book.authorId && book.authorId.toString() !== authorId.toString()) {
    throw AppError.forbidden('You can only update your own books');
  }

  // If title changed, regenerate slug
  if (data.title && data.title !== book.title) {
    data.slug = slugify(data.title, { lower: true, strict: true });
    const existing = await Book.findOne({ slug: data.slug, _id: { $ne: bookId } });
    if (existing) throw AppError.conflict('A book with this title already exists');
  }

  Object.assign(book, data);
  await book.save();
  return book;
};

/**
 * Permanently delete a book and all its chapters
 */
const deleteBook = async (bookId) => {
  const book = await Book.findById(bookId);
  if (!book) throw AppError.notFound('Book not found');

  // Delete all chapters belonging to this book
  await Chapter.deleteMany({ bookId });

  // Delete the book itself
  await Book.findByIdAndDelete(bookId);

  return null;
};

/**
 * Toggle featured status
 */
const toggleFeatured = async (bookId) => {
  const book = await Book.findById(bookId);
  if (!book) throw AppError.notFound('Book not found');

  book.isFeatured = !book.isFeatured;
  await book.save();
  return book;
};

module.exports = {
  createBook,
  getBooks,
  getBookById,
  getBookBySlug,
  updateBook,
  deleteBook,
  toggleFeatured,
};
