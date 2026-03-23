const Banner = require('../banners/Banner.model');
const Category = require('../categories/Category.model');
const User = require('../users/User.model');
const Book = require('../books/Book.model');
const Audiobook = require('../audiobooks/Audiobook.model');
const PodcastSeries = require('../podcasts/PodcastSeries.model');
const PodcastEpisode = require('../podcasts/PodcastEpisode.model');
const Chapter = require('../chapters/Chapter.model');
const Video = require('../videos/Video.model');
const Library = require('./Library.model');
const Wishlist = require('./Wishlist.model');
const ContentProgress = require('./ContentProgress.model');
const BookPurchase = require('../payments/BookPurchase.model');
const Review = require('../reviews/Review.model');
const Wallet = require('../wallet/Wallet.model');
const AppError = require('../../common/AppError');
const { asyncHandler } = require('../../common/errorHandler');

// ─── Helpers ─────────────────────────────────────────────────

/**
 * Transform a Book document to the mobile Content format
 */
const bookToContent = (book) => ({
  id: book._id.toString(),
  title: book.title,
  description: book.description || '',
  content_type: 'book',
  book_content_type: book.contentType || 'ebook',
  cover_image: book.coverImage || '',
  author_id: book.authorId ? book.authorId._id?.toString() || book.authorId.toString() : '',
  author_name: book.authorId?.displayName || book.authorId?.name || 'Unknown',
  category_ids: book.categoryId ? [book.categoryId._id?.toString() || book.categoryId.toString()] : [],
  language: book.bookLanguage || book.language || 'en',
  rating: book.averageRating || 0,
  reviews_count: book.ratingCount || 0,
  access_type: book.isFree ? 'free' : 'paid',
  price_inr: book.isFree ? 0 : (book.contentType === 'audiobook' ? (book.audiobookPrice || 0) : (book.ebookPrice || 0)),
  coin_price: 0,
  chapters: [],
  is_trending: true,
  is_purchased: false,
  is_featured: book.isFeatured || false,
  is_new_release: book.publishedAt ? Date.now() - new Date(book.publishedAt).getTime() < 30 * 24 * 60 * 60 * 1000 : false,
  created_at: book.createdAt ? book.createdAt.toISOString() : new Date().toISOString(),
  slug: book.slug,
});

/**
 * Transform a PodcastSeries document to the mobile Content format
 */
const podcastToContent = (series) => ({
  id: series._id.toString(),
  title: series.title,
  description: series.description || '',
  content_type: 'podcast',
  cover_image: series.thumbnail || '',
  author_id: series.authorId ? series.authorId._id?.toString() || series.authorId.toString() : '',
  author_name: series.authorId?.displayName || series.authorId?.name || 'Unknown',
  category_ids: series.categoryId ? [series.categoryId._id?.toString() || series.categoryId.toString()] : [],
  language: 'en',
  rating: 0,
  reviews_count: series.totalEpisodes || 0,
  access_type: 'free',
  coin_price: 0,
  chapters: [],
  is_trending: (series.totalEpisodes || 0) > 0,   // any published series with episodes
  is_featured: series.isFeatured || false,
  is_new_release: series.createdAt ? Date.now() - new Date(series.createdAt).getTime() < 90 * 24 * 60 * 60 * 1000 : false,
  created_at: series.createdAt ? series.createdAt.toISOString() : new Date().toISOString(),
});

/**
 * Transform a Video document to the mobile Content format
 */
const videoToContent = (video) => ({
  id: video._id.toString(),
  title: video.title,
  description: video.description || '',
  content_type: 'video',
  cover_image: video.thumbnail || video.youtubeMeta?.thumbnailUrl || '',
  author_id: video.authorId ? video.authorId.toString() : '',
  author_name: 'Unknown',
  category_ids: [],
  language: 'en',
  rating: 0,
  reviews_count: 0,
  access_type: video.isFree ? 'free' : 'paid',
  coin_price: 0,
  price_inr: video.isFree ? 0 : (video.price || video.coinCost || 0),
  chapters: [],
  is_trending: video.viewCount > 100,
  is_featured: false,
  is_new_release: video.createdAt ? Date.now() - new Date(video.createdAt).getTime() < 30 * 24 * 60 * 60 * 1000 : false,
  created_at: video.createdAt ? video.createdAt.toISOString() : new Date().toISOString(),
});

/**
 * Transform a Book + aggregate audiobook stats to mobile Content format (audiobook type)
 * book: populated Book doc; totalListens: sum of listenCounts; isFree/coinCost from first track
 */
const audiobookToContent = (book, { totalListens = 0, isFree = true, price = 0 } = {}) => ({
  id: book._id.toString(),
  title: book.title,
  description: book.description || '',
  content_type: 'audiobook',
  cover_image: book.coverImage || '',
  author_id: book.authorId ? book.authorId._id?.toString() || book.authorId.toString() : '',
  author_name: book.authorId?.displayName || book.authorId?.name || 'Unknown',
  category_ids: book.categoryId ? [book.categoryId._id?.toString() || book.categoryId.toString()] : [],
  language: book.bookLanguage || book.language || 'en',
  rating: book.averageRating || 0,
  reviews_count: book.ratingCount || 0,
  access_type: isFree ? 'free' : 'paid',
  coin_price: 0,
  price_inr: isFree ? 0 : price,
  chapters: [],
  is_trending: true,
  is_featured: book.isFeatured || false,
  is_new_release: book.publishedAt ? Date.now() - new Date(book.publishedAt).getTime() < 30 * 24 * 60 * 60 * 1000 : false,
  created_at: book.createdAt ? book.createdAt.toISOString() : new Date().toISOString(),
  slug: book.slug,
});

// ─── Profile Controllers (Authenticated) ─────────────────────

/**
 * GET /api/v1/reader/profile
 */
const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId).lean();
  if (!user) throw AppError.notFound('User not found');
  const wallet = await Wallet.findOne({ userId: user._id }).lean();
  res.json({
    success: true,
    data: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      mobile_number: user.phone || '',
      country_code: '',
      profile_image: user.profileImage || '',
      coin_balance: wallet ? wallet.availableCoins : 0,
      is_premium: user.isPremium || false,
      referral_code: user.referralCode || '',
      created_at: user.createdAt ? new Date(user.createdAt).toISOString() : new Date().toISOString(),
      preferences: user.preferences || {},
    },
  });
});

/**
 * PUT /api/v1/reader/profile
 * Body: { name }
 */
const updateProfile = asyncHandler(async (req, res) => {
  const { name } = req.body;
  const update = {};
  if (name && name.trim()) update.name = name.trim();

  const user = await User.findByIdAndUpdate(req.userId, update, { new: true }).lean();
  if (!user) throw AppError.notFound('User not found');

  res.json({
    success: true,
    data: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      profile_image: user.profileImage || '',
      preferences: user.preferences || {},
    },
  });
});

/**
 * PUT /api/v1/reader/profile/preferences
 * Body: { language?, notifications? }
 */
const updatePreferences = asyncHandler(async (req, res) => {
  const { language, notifications } = req.body;
  const prefUpdate = {};
  if (language !== undefined) prefUpdate['preferences.language'] = language;
  if (notifications !== undefined) prefUpdate['preferences.notifications'] = notifications;

  const user = await User.findByIdAndUpdate(req.userId, prefUpdate, { new: true }).lean();
  if (!user) throw AppError.notFound('User not found');

  res.json({ success: true, data: { preferences: user.preferences || {} } });
});

// ─── Public Controllers ───────────────────────────────────────

/**
 * GET /api/v1/reader/banners
 */
const getBanners = asyncHandler(async (req, res) => {
  const now = new Date();
  const banners = await Banner.find({
    isActive: true,
    startDate: { $lte: now },
    endDate: { $gte: now },
  })
    .sort({ priority: -1, createdAt: -1 })
    .lean();

  const formatted = banners.map((b) => ({
    id: b._id.toString(),
    title: b.title || '',
    image: b.imageUrl || '',
    content_id: b.linkId ? b.linkId.toString() : null,
    action_url: b.externalUrl || null,
    order: b.priority || 0,
    active: b.isActive !== false,
  }));
  res.json({ success: true, data: formatted });
});

/**
 * GET /api/v1/reader/categories
 */
const getCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find().sort({ sortOrder: 1, name: 1 }).lean();
  const formatted = categories.map((c) => ({
    id: c._id.toString(),
    name: c.name,
    slug: c.slug,
    image: c.image || null,
  }));
  res.json({ success: true, data: formatted });
});

/**
 * GET /api/v1/reader/search?q=query&content_type=book&limit=20
 */
const searchContent = asyncHandler(async (req, res) => {
  const { q, content_type, limit = 20 } = req.query;
  if (!q || q.trim().length < 1) {
    return res.json({ success: true, data: [] });
  }

  const results = [];
  const searchRegex = { $regex: q, $options: 'i' };
  const lim = Math.min(parseInt(limit) || 20, 100);

  if (!content_type || content_type === 'book') {
    const books = await Book.find({
      status: 'published',
      $or: [{ title: searchRegex }, { description: searchRegex }],
    })
      .populate('authorId', 'displayName name')
      .limit(lim)
      .lean();
    results.push(...books.map(bookToContent));
  }

  if (!content_type || content_type === 'podcast') {
    const podcasts = await PodcastSeries.find({
      $or: [{ title: searchRegex }, { description: searchRegex }],
    })
      .limit(lim)
      .lean();
    results.push(...podcasts.map(podcastToContent));
  }

  if (!content_type || content_type === 'video') {
    const videos = await Video.find({
      $or: [{ title: searchRegex }, { description: searchRegex }],
    })
      .limit(lim)
      .lean();
    results.push(...videos.map(videoToContent));
  }

  res.json({ success: true, data: results });
});

/**
 * GET /api/v1/reader/content
 * Unified content feed with filters: content_type, is_trending, is_featured, is_new_release, category_id, limit
 */
const getContent = asyncHandler(async (req, res) => {
  const { content_type, is_trending, is_featured, is_new_release, category_id, limit = 20 } = req.query;
  const lim = Math.min(parseInt(limit) || 20, 100);
  const results = [];

  console.log("content_type",content_type)
  // Books (ebooks only — also include legacy docs where contentType is not set)
  if (!content_type || content_type === 'book') {
    const bookQuery = { status: 'published', contentType: { $in: ['ebook', null] } };
    if (is_featured === 'true') bookQuery.isFeatured = true;
    if (category_id) bookQuery.categoryId = category_id;

    const books = await Book.find(bookQuery)
      .populate('authorId', 'displayName name')
      .sort({ totalReads: -1, createdAt: -1 })
      .limit(lim)
      .lean();

    let bookResults = books.map(bookToContent);
    if (is_trending === 'true') bookResults = bookResults.filter((b) => b.is_trending);
    if (is_new_release === 'true') bookResults = bookResults.filter((b) => b.is_new_release);
    results.push(...bookResults);
  }

  // Audiobooks — query Book directly with contentType: 'audiobook'
  if (!content_type || content_type === 'audiobook') {
    const audiobookQuery = { status: 'published', contentType: 'audiobook' };
    if (is_featured === 'true') audiobookQuery.isFeatured = true;
    if (category_id) audiobookQuery.categoryId = category_id;

    const audiobooks = await Book.find(audiobookQuery)
      .populate('authorId', 'displayName name')
      .sort({ totalReads: -1, createdAt: -1 })
      .limit(lim)
      .lean();

    let abResults = audiobooks.map((book) =>
      audiobookToContent(book, {
        totalListens: 0,
        isFree: book.isFree,
        price: book.audiobookPrice || 0,
      })
    );

    if (is_trending === 'true') abResults = abResults.filter((a) => a.is_trending);
    if (is_featured === 'true') abResults = abResults.filter((a) => a.is_featured);
    if (is_new_release === 'true') abResults = abResults.filter((a) => a.is_new_release);
    results.push(...abResults);
  }

  // Podcasts
  if (!content_type || content_type === 'podcast') {
    const podcastQuery = { status: 'published' };
    if (is_featured === 'true') podcastQuery.isFeatured = true;
    if (category_id) podcastQuery.categoryId = category_id;

    const podcasts = await PodcastSeries.find(podcastQuery)
      .sort({ createdAt: -1 })
      .limit(lim)
      .lean();

    let podcastResults = podcasts.map(podcastToContent);
    if (is_new_release === 'true') podcastResults = podcastResults.filter((p) => p.is_new_release);
    results.push(...podcastResults);
  }

  if (!content_type || content_type === 'video') {
    const videoQuery = {};
    if (is_featured === 'true') videoQuery.isFeatured = true;

    const videos = await Video.find(videoQuery)
      .sort({ createdAt: -1 })
      .limit(lim)
      .lean();

    let videoResults = videos.map(videoToContent);

    if (is_new_release === 'true') {
      videoResults = videoResults.filter((v) => v.is_new_release);
    }

    results.push(...videoResults);
  }

  res.json({ success: true, data: results });
});

/**
 * GET /api/v1/reader/content/:id
 * Get any content item by ID
 */
const getContentById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Try book first
  let book = await Book.findById(id)
    .populate('authorId', 'displayName name avatar bio')
    .populate('categoryId', 'name slug')
    .lean()
    .catch(() => null);

  if (book) {
    const content = bookToContent(book);

    if (book.contentType === 'audiobook') {
      // Audiobook: chapters come from the Audiobook tracks collection
      const audioTracks = await Audiobook.find({ bookId: id, status: 'published' })
        .sort({ orderNumber: 1 })
        .lean();
      content.chapters = audioTracks.map(track => ({
        id: track._id.toString(),
        title: track.title,
        order: track.orderNumber,
        duration: track.duration || 0,
        audio_url: track.audioUrl || '',
        narrator: track.narrator || '',
        is_free: false,
        coin_cost: 0,
      }));
    } else {
      // Ebook: chapters from Chapter collection, optionally with audio URLs
      const [chapters, audioTracks] = await Promise.all([
        Chapter.find({ bookId: id, status: 'published' }).sort({ orderNumber: 1 }).lean(),
        Audiobook.find({ bookId: id, status: 'published' }).lean(),
      ]);

      const audioUrlMap = {};
      audioTracks.forEach(track => {
        if (track.chapterId) audioUrlMap[track.chapterId.toString()] = track.audioUrl || '';
      });

      content.chapters = chapters.map(ch => ({
        id: ch._id.toString(),
        title: ch.title,
        order: ch.orderNumber,
        is_free: ch.isFree,
        coin_cost: ch.coinCost,
        estimated_read_time: ch.estimatedReadTime || 0,
        audio_url: audioUrlMap[ch._id.toString()] || '',
      }));
    }

    // If the user is authenticated, check whether they have purchased this book
    if (req.userId) {
      const purchase = await BookPurchase.findOne({
        userId: req.userId,
        bookId: id,
        status: 'completed',
      }).lean();
      content.is_purchased = !!purchase;
    }

    return res.json({ success: true, data: content });
  }

  // Try podcast
  let podcast = await PodcastSeries.findById(id).lean().catch(() => null);
  if (podcast) {
    const episodes = await PodcastEpisode.find({ seriesId: id, status: 'published' }).sort({ episodeNumber: 1 }).lean();
    const content = podcastToContent(podcast);
    content.chapters = episodes.map(ep => ({
      id: ep._id.toString(),
      title: ep.title,
      order: ep.episodeNumber,
      duration: ep.duration,
      youtube_id: ep.youtubeMeta?.videoId || '',
      thumbnail: ep.thumbnail || ep.youtubeMeta?.thumbnailUrl || '',
      is_free: ep.isFree,
      coin_cost: ep.coinCost,
      description: ep.description || '',
    }));
    return res.json({ success: true, data: content });
  }

  // Try video
  let video = await Video.findById(id).lean().catch(() => null);
  if (video) {
    return res.json({ success: true, data: videoToContent(video) });
  }

  throw AppError.notFound('Content not found');
});

/**
 * GET /api/v1/reader/audiobook/:id
 * Get audiobook detail by bookId
 */
const getAudiobookById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const book = await Book.findById(id)
    .populate('authorId', 'displayName name avatar bio')
    .lean()
    .catch(() => null);

  if (!book) {
    throw AppError.notFound('Audiobook not found');
  }

  const tracks = await Audiobook.find({ bookId: id, status: 'published' }).sort({ _id: 1 }).lean();

  const totalDuration = tracks.reduce((sum, t) => sum + (t.duration || 0), 0);
  const narratorName = tracks.length > 0 ? tracks[0].narrator || '' : '';
  const totalListens = tracks.reduce((sum, t) => sum + (t.listenCount || 0), 0);

  // Use Book-level isFree/price so it's correct even when no tracks exist yet
  const isFree = book.isFree;
  const price = book.audiobookPrice || 0;

  const content = audiobookToContent(book, { totalListens, isFree, price });
  content.duration = totalDuration;
  content.narrator_name = narratorName;
  content.chapters = tracks.map((t, i) => ({
    id: t._id.toString(),
    title: t.title,
    order: i + 1,
    duration: t.duration,
    audio_url: t.audioUrl || '',
    narrator: t.narrator || '',
  }));

  res.json({ success: true, data: content });
});

// ─── Library Controllers (Authenticated) ─────────────────────

/**
 * Enrich a list of { contentId, contentType } records into full Content objects
 */
const enrichEntries = async (entries) => {
  const results = [];
  for (const entry of entries) {
    try {
      if (entry.contentType === 'book') {
        const doc = await Book.findById(entry.contentId)
          .populate('authorId', 'displayName name')
          .lean();
        if (doc) results.push(bookToContent(doc));
      } else if (entry.contentType === 'audiobook') {
        // Audiobooks share the Book document; price/access at book level
        const doc = await Book.findById(entry.contentId)
          .populate('authorId', 'displayName name')
          .lean();
        if (doc) {
          const tracks = await Audiobook.find({ bookId: entry.contentId, status: 'published' }).lean();
          const totalListens = tracks.reduce((sum, t) => sum + (t.listenCount || 0), 0);
          results.push(audiobookToContent(doc, {
            totalListens,
            isFree: doc.isFree,
            price: doc.audiobookPrice || 0,
          }));
        }
      } else if (entry.contentType === 'podcast') {
        const doc = await PodcastSeries.findById(entry.contentId).lean();
        if (doc) results.push(podcastToContent(doc));
      } else if (entry.contentType === 'video') {
        const doc = await Video.findById(entry.contentId).lean();
        if (doc) results.push(videoToContent(doc));
      }
    } catch (_) {
      // skip invalid/deleted content
    }
  }
  return results;
};

/**
 * GET /api/v1/reader/library?page=1&limit=20
 */
const getLibrary = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
  const skip = (page - 1) * limit;

  const [total, entries] = await Promise.all([
    Library.countDocuments({ userId: req.userId }),
    Library.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  const content = await enrichEntries(entries);
  res.json({
    success: true,
    data: content,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

/**
 * POST /api/v1/reader/library/:contentId
 * Body: { content_type }
 */
const addToLibrary = asyncHandler(async (req, res) => {
  const { contentId } = req.params;
  const { content_type = 'book' } = req.body;

  await Library.findOneAndUpdate(
    { userId: req.userId, contentId },
    { userId: req.userId, contentId, contentType: content_type },
    { upsert: true, new: true }
  );

  res.json({ success: true, message: 'Added to library' });
});

/**
 * DELETE /api/v1/reader/library/:contentId
 */
const removeFromLibrary = asyncHandler(async (req, res) => {
  const { contentId } = req.params;
  await Library.findOneAndDelete({ userId: req.userId, contentId });
  res.json({ success: true, message: 'Removed from library' });
});

// ─── Wishlist Controllers (Authenticated) ─────────────────────

/**
 * GET /api/v1/reader/wishlist?page=1&limit=20
 */
const getWishlist = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
  const skip = (page - 1) * limit;

  const [total, entries] = await Promise.all([
    Wishlist.countDocuments({ userId: req.userId }),
    Wishlist.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  const content = await enrichEntries(entries);
  res.json({
    success: true,
    data: content,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

/**
 * POST /api/v1/reader/wishlist/:contentId
 * Body: { content_type }
 */
const addToWishlist = asyncHandler(async (req, res) => {
  const { contentId } = req.params;
  const { content_type = 'book' } = req.body;

  await Wishlist.findOneAndUpdate(
    { userId: req.userId, contentId },
    { userId: req.userId, contentId, contentType: content_type },
    { upsert: true, new: true }
  );

  res.json({ success: true, message: 'Added to wishlist' });
});

/**
 * DELETE /api/v1/reader/wishlist/:contentId
 */
const removeFromWishlist = asyncHandler(async (req, res) => {
  const { contentId } = req.params;
  await Wishlist.findOneAndDelete({ userId: req.userId, contentId });
  res.json({ success: true, message: 'Removed from wishlist' });
});

// ─── Progress Controllers (Authenticated) ─────────────────────

/**
 * GET /api/v1/reader/progress
 */
const getProgress = asyncHandler(async (req, res) => {
  const progress = await ContentProgress.find({ userId: req.userId })
    .sort({ lastAccessedAt: -1 })
    .lean();

  const formatted = progress.map((p) => ({
    id: p._id.toString(),
    user_id: p.userId.toString(),
    content_id: p.contentId,
    content_type: p.contentType,
    current_chapter_id: p.currentChapterId,
    current_position: p.currentPosition,
    total_progress: p.totalProgress,
    last_accessed: p.lastAccessedAt ? p.lastAccessedAt.toISOString() : new Date().toISOString(),
    completed: p.completed,
  }));

  res.json({ success: true, data: formatted });
});

/**
 * GET /api/v1/reader/progress/:contentId
 */
const getProgressByContent = asyncHandler(async (req, res) => {
  const { contentId } = req.params;
  const progress = await ContentProgress.findOne({ userId: req.userId, contentId }).lean();

  if (!progress) {
    return res.json({ success: true, data: null });
  }

  res.json({
    success: true,
    data: {
      id: progress._id.toString(),
      user_id: progress.userId.toString(),
      content_id: progress.contentId,
      content_type: progress.contentType,
      current_chapter_id: progress.currentChapterId,
      current_position: progress.currentPosition,
      total_progress: progress.totalProgress,
      last_accessed: progress.lastAccessedAt ? progress.lastAccessedAt.toISOString() : new Date().toISOString(),
      completed: progress.completed,
    },
  });
});

/**
 * POST /api/v1/reader/progress
 * Body: { content_id, content_type, current_chapter_id, current_position, total_progress, completed }
 */
const saveProgress = asyncHandler(async (req, res) => {
  const { content_id, content_type, current_chapter_id, current_position, total_progress, completed } = req.body;

  if (!content_id || !content_type) {
    throw AppError.badRequest('content_id and content_type are required');
  }

  const progress = await ContentProgress.findOneAndUpdate(
    { userId: req.userId, contentId: content_id },
    {
      userId: req.userId,
      contentId: content_id,
      contentType: content_type,
      currentChapterId: current_chapter_id || null,
      currentPosition: current_position || 0,
      totalProgress: total_progress || 0,
      completed: completed || false,
      lastAccessedAt: new Date(),
    },
    { upsert: true, new: true }
  );

  res.json({
    success: true,
    data: {
      id: progress._id.toString(),
      user_id: progress.userId.toString(),
      content_id: progress.contentId,
      content_type: progress.contentType,
      current_chapter_id: progress.currentChapterId,
      current_position: progress.currentPosition,
      total_progress: progress.totalProgress,
      last_accessed: progress.lastAccessedAt.toISOString(),
      completed: progress.completed,
    },
  });
});

/**
 * GET /api/v1/reader/books/:bookId/chapter-status
 * Returns chapters of a book annotated with per-user unlock status.
 * Requires authentication. Uses subscription + coin-unlock checks.
 */
const getChapterUnlockStatus = asyncHandler(async (req, res) => {
  const { bookId } = req.params;
  const userDoc = req.user; // always set because route uses authenticate

  const chapters = await Chapter.find({ bookId, status: 'published' })
    .sort({ orderNumber: 1 })
    .lean();

  const UnlockTransaction = require('../wallet/UnlockTransaction.model');

  // Check if user has an active premium plan
  const hasActivePlan =
    userDoc.isPremium === true &&
    (!userDoc.premiumExpiresAt || new Date(userDoc.premiumExpiresAt) > new Date());

  // Fetch all coin-unlock records for this user's chapters in one query
  const chapterIds = chapters.map((c) => c._id);
  const unlocks = await UnlockTransaction.find({
    userId: userDoc._id,
    contentType: 'chapter',
    contentId: { $in: chapterIds },
  }).lean();
  const unlockedSet = new Set(unlocks.map((u) => u.contentId.toString()));

  const result = chapters.map((ch) => {
    const isFree = ch.isFree === true;
    const isCoinUnlocked = unlockedSet.has(ch._id.toString());
    const isUnlocked = isFree || hasActivePlan || isCoinUnlocked;

    return {
      id: ch._id.toString(),
      title: ch.title,
      order: ch.orderNumber,
      is_free: isFree,
      coin_cost: ch.coinCost || 0,
      estimated_read_time: ch.estimatedReadTime || 0,
      is_unlocked: isUnlocked,
      access_reason: isFree
        ? 'free'
        : hasActivePlan
        ? 'subscription'
        : isCoinUnlocked
        ? 'coins'
        : 'locked',
    };
  });

  res.json({ success: true, data: result, has_active_plan: hasActivePlan });
});

/**
 * GET /api/v1/reader/purchases
 * Returns all books the authenticated user has purchased.
 */
const getMyPurchases = asyncHandler(async (req, res) => {
  const purchases = await BookPurchase.find({
    userId: req.userId,
    status: 'completed',
  })
    .sort({ createdAt: -1 })
    .lean();

  const bookIds = purchases.map((p) => p.bookId);

  const books = await Book.find({ _id: { $in: bookIds } })
    .populate('authorId', 'displayName name')
    .lean();

  const bookMap = {};
  books.forEach((b) => { bookMap[b._id.toString()] = b; });

  const contents = purchases
    .map((p) => {
      const book = bookMap[p.bookId.toString()];
      if (!book) return null;
      const content = bookToContent(book);
      content.is_purchased = true;
      return content;
    })
    .filter(Boolean);

  res.json({ success: true, data: contents });
});

/**
 * GET /api/v1/reader/referrals
 * Returns the user's referral code + stats + referral history
 */
const getMyReferrals = asyncHandler(async (req, res) => {
  const Referral = require('../referrals/Referral.model');
  const userId = req.userId;

  // Read the persisted referral code from the user document
  const userDoc = await User.findById(userId).select('referralCode').lean();
  const referralCode = userDoc?.referralCode || '';

  const referrals = await Referral.find({ referrerId: userId })
    .populate('refereeId', 'name email')
    .sort({ createdAt: -1 })
    .lean();

  const stats = {
    total: referrals.length,
    successful: referrals.filter((r) => r.status === 'completed').length,
    pending: referrals.filter((r) => r.status === 'pending').length,
    totalRewards: referrals.filter((r) => r.rewardGiven).reduce((sum, r) => sum + (r.rewardAmount || 0), 0),
  };

  res.json({ success: true, data: { referralCode, referrals, stats } });
});

/**
 * GET /api/v1/reader/books/:bookId/review
 * Returns the authenticated user's review for a book (null if none).
 */
const getMyBookReview = asyncHandler(async (req, res) => {
  const review = await Review.findOne({
    userId: req.userId,
    contentType: 'book',
    contentId: req.params.bookId,
  }).lean();
  res.json({ success: true, data: review || null });
});

/**
 * POST /api/v1/reader/books/:bookId/review
 * Submit a review — only allowed after purchase; one per user per book.
 */
const submitBookReview = asyncHandler(async (req, res) => {
  const { bookId } = req.params;
  const { rating = 5, body = '' } = req.body;

  const purchase = await BookPurchase.findOne({ userId: req.userId, bookId, status: 'completed' });
  if (!purchase) throw AppError.forbidden('Purchase this book to leave a review');

  const existing = await Review.findOne({ userId: req.userId, contentType: 'book', contentId: bookId });
  if (existing) throw AppError.conflict('You have already reviewed this book');

  const review = await Review.create({
    userId: req.userId,
    contentType: 'book',
    contentId: bookId,
    rating: Math.min(5, Math.max(1, Number(rating) || 5)),
    body: String(body).trim(),
    status: 'approved',
  });

  // Update book average rating
  const all = await Review.find({ contentType: 'book', contentId: bookId, status: 'approved' }).lean();
  const avg = all.reduce((s, r) => s + r.rating, 0) / all.length;
  await Book.findByIdAndUpdate(bookId, { averageRating: +avg.toFixed(1), ratingCount: all.length });

  res.json({ success: true, data: review });
});

module.exports = {
  getProfile,
  updateProfile,
  updatePreferences,
  getBanners,
  getCategories,
  searchContent,
  getContent,
  getContentById,
  getAudiobookById,
  getLibrary,
  addToLibrary,
  removeFromLibrary,
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  getProgress,
  getProgressByContent,
  saveProgress,
  getChapterUnlockStatus,
  getMyPurchases,
  getMyReferrals,
  getMyBookReview,
  submitBookReview,
};
