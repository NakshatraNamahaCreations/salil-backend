const Audiobook = require('./Audiobook.model');
const Book = require('../books/Book.model');
const AppError = require('../../common/AppError');
const { asyncHandler } = require('../../common/errorHandler');
const { success, created } = require('../../common/response');

/**
 * GET /api/v1/admin/audiobooks
 * Query: bookId, search, page, limit
 */
const getAudiobooks = asyncHandler(async (req, res) => {
  const { bookId, search, page = 1, limit = 20 } = req.query;
  const query = {};
  if (bookId) query.bookId = bookId;

  let tracks = await Audiobook.find(query)
    .populate({ path: 'bookId', select: 'title authorId coverImage', populate: { path: 'authorId', select: 'displayName name' } })
    .sort({ bookId: 1, orderNumber: 1 })
    .lean();

  if (search) {
    const re = new RegExp(search, 'i');
    tracks = tracks.filter(t => re.test(t.title) || re.test(t.narrator));
  }

  const total = tracks.length;
  const skip = (Number(page) - 1) * Number(limit);
  const data = tracks.slice(skip, skip + Number(limit));

  return res.json({
    success: true,
    data,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    },
  });
});

/**
 * POST /api/v1/admin/audiobooks
 * Body: { bookId, title, audioUrl, duration, narrator, status }
 */
const createAudiobook = asyncHandler(async (req, res) => {
  const { bookId, title, duration, narrator, status, orderNumber } = req.body;

  let audioUrl = req.body.audioUrl || '';
  if (req.file && req.file.location) {
    audioUrl = req.file.location;
  }

  if (!bookId || !title) throw AppError.badRequest('bookId and title are required');

  const book = await Book.findById(bookId);
  if (!book) throw AppError.notFound('Book not found');

  const track = await Audiobook.create({
    bookId,
    orderNumber: Number(orderNumber) || 1,
    title,
    audioUrl,
    duration: Number(duration) || 0,
    narrator: narrator || '',
    status: status || 'draft',
  });

  // Keep totalChapters in sync
  await Book.findByIdAndUpdate(bookId, { $inc: { totalChapters: 1 } });

  await track.populate({ path: 'bookId', select: 'title authorId', populate: { path: 'authorId', select: 'displayName name' } });

  created(res, track, 'Audiobook track created successfully');
});

/**
 * GET /api/v1/admin/audiobooks/:id
 */
const getAudiobook = asyncHandler(async (req, res) => {
  const track = await Audiobook.findById(req.params.id)
    .populate({ path: 'bookId', select: 'title authorId coverImage', populate: { path: 'authorId', select: 'displayName name' } });
  if (!track) throw AppError.notFound('Audiobook track not found');
  success(res, track);
});

/**
 * PUT /api/v1/admin/audiobooks/:id
 */
const updateAudiobook = asyncHandler(async (req, res) => {
  const { title, duration, narrator, status, orderNumber } = req.body;
  let audioUrl = req.body.audioUrl;

  if (req.file && req.file.location) {
    audioUrl = req.file.location;
  }

  const track = await Audiobook.findByIdAndUpdate(
    req.params.id,
    {
      ...(title !== undefined && { title }),
      ...(audioUrl !== undefined && { audioUrl }),
      ...(duration !== undefined && { duration: Number(duration) }),
      ...(narrator !== undefined && { narrator }),
      ...(status !== undefined && { status }),
      ...(orderNumber !== undefined && { orderNumber: Number(orderNumber) }),
    },
    { new: true, runValidators: true }
  ).populate({ path: 'bookId', select: 'title authorId', populate: { path: 'authorId', select: 'displayName name' } });

  if (!track) throw AppError.notFound('Audiobook track not found');
  success(res, track, 'Audiobook track updated successfully');
});

/**
 * DELETE /api/v1/admin/audiobooks/:id
 */
const deleteAudiobook = asyncHandler(async (req, res) => {
  const track = await Audiobook.findByIdAndDelete(req.params.id);
  if (!track) throw AppError.notFound('Audiobook track not found');
  await Book.findByIdAndUpdate(track.bookId, { $inc: { totalChapters: -1 } });
  success(res, null, 'Audiobook track deleted');
});

/**
 * PATCH /api/v1/admin/audiobooks/:id/publish
 * Toggle draft <-> published
 */
const togglePublish = asyncHandler(async (req, res) => {
  const track = await Audiobook.findById(req.params.id);
  if (!track) throw AppError.notFound('Audiobook track not found');

  track.status = track.status === 'published' ? 'draft' : 'published';
  await track.save();
  success(res, track, `Track ${track.status}`);
});

module.exports = { getAudiobooks, createAudiobook, getAudiobook, updateAudiobook, deleteAudiobook, togglePublish };
