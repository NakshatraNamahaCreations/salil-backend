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

/**
 * POST /api/v1/admin/audiobooks/bulk-zip
 * Body (multipart): bookId, zipFile
 */
const bulkZipUploadAudiobooks = asyncHandler(async (req, res) => {
  const AppError = require('../../common/AppError');
  if (!req.file) throw AppError.badRequest('ZIP file is required');

  const { bookId } = req.body;
  if (!bookId) throw AppError.badRequest('bookId is required');

  const book = await Book.findById(bookId);
  if (!book) throw AppError.notFound('Book not found');

  const AdmZip = require('adm-zip');
  const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
  const config = require('../../config');

  const AUDIO_EXTS = ['.mp3', '.m4a', '.wav', '.aac', '.ogg', '.flac', '.opus', '.wma'];

  const zip = new AdmZip(req.file.buffer);

  const audioEntries = zip.getEntries()
    .filter(entry =>
      !entry.isDirectory &&
      !entry.entryName.includes('__MACOSX') &&
      AUDIO_EXTS.some(ext => entry.entryName.toLowerCase().endsWith(ext))
    )
    .sort((a, b) => {
      const nameA = a.entryName.split('/').pop();
      const nameB = b.entryName.split('/').pop();
      return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
    });

  if (audioEntries.length === 0) {
    throw AppError.badRequest('No audio files found in the ZIP');
  }

  const s3Client = new S3Client({
    credentials: {
      accessKeyId: config.aws.accessKeyId,
      secretAccessKey: config.aws.secretAccessKey,
    },
    region: config.aws.region,
  });

  const lastTrack = await Audiobook.findOne({ bookId }).sort({ orderNumber: -1 });
  let nextOrder = lastTrack ? lastTrack.orderNumber + 1 : 1;

  const results = [];
  const errors = [];

  for (const entry of audioEntries) {
    try {
      const filename = entry.entryName.split('/').pop();
      const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase();
      const title = filename.replace(/\.[^/.]+$/, '');
      const audioBuffer = zip.readFile(entry);

      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const s3Key = `audio/${uniqueSuffix}${ext}`;

      const mimeMap = {
        '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.wav': 'audio/wav',
        '.aac': 'audio/aac', '.ogg': 'audio/ogg', '.flac': 'audio/flac',
        '.opus': 'audio/opus', '.wma': 'audio/x-ms-wma',
      };

      await s3Client.send(new PutObjectCommand({
        Bucket: config.aws.s3Bucket,
        Key: s3Key,
        Body: audioBuffer,
        ContentType: mimeMap[ext] || 'audio/mpeg',
      }));

      const audioUrl = `https://${config.aws.s3Bucket}.s3.${config.aws.region}.amazonaws.com/${s3Key}`;

      const track = await Audiobook.create({
        bookId,
        orderNumber: nextOrder++,
        title,
        audioUrl,
        duration: 0,
        narrator: '',
        status: 'published',
      });

      results.push({ title, trackId: track._id });
    } catch (err) {
      errors.push({ file: entry.entryName, error: err.message });
    }
  }

  await Book.findByIdAndUpdate(bookId, { $inc: { totalChapters: results.length } });

  success(res, {
    uploaded: results.length,
    failed: errors.length,
    tracks: results,
    errors,
  }, `${results.length} track(s) uploaded from ZIP`);
});

module.exports = { getAudiobooks, createAudiobook, getAudiobook, updateAudiobook, deleteAudiobook, togglePublish, bulkZipUploadAudiobooks };
