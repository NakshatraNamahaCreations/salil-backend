const PodcastSeries = require('./PodcastSeries.model');
const PodcastEpisode = require('./PodcastEpisode.model');
const AppError = require('../../common/AppError');
const slugify = require('slugify');

// ─── Series ──────────────────────────────────────────────

const createSeries = async (data, authorId = null) => {
  const slug = slugify(data.title, { lower: true, strict: true });
  const existing = await PodcastSeries.findOne({ slug });
  if (existing) throw AppError.conflict('A podcast series with this title already exists');

  const seriesData = { ...data, slug };
  if (authorId) seriesData.authorId = authorId;

  const series = new PodcastSeries(seriesData);
  await series.save();
  return series;
};

const getAllSeries = async ({ page = 1, limit = 20, search, status, authorId, categoryId }) => {
  const query = {};
  if (search) query.$or = [{ title: { $regex: search, $options: 'i' } }];
  if (status) query.status = status;
  if (authorId) query.authorId = authorId;
  if (categoryId) query.categoryId = categoryId;

  const skip = (page - 1) * limit;
  const [series, total] = await Promise.all([
    PodcastSeries.find(query)
      .populate('authorId', 'displayName avatar')
      .populate('categoryId', 'name slug')
      .sort({ createdAt: -1 })
      .skip(skip).limit(limit).lean(),
    PodcastSeries.countDocuments(query),
  ]);
  return { series, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
};

const getSeriesById = async (id) => {
  const series = await PodcastSeries.findById(id)
    .populate('authorId', 'displayName avatar bio')
    .populate('categoryId', 'name slug');
  if (!series) throw AppError.notFound('Podcast series not found');
  return series;
};

const updateSeries = async (id, data) => {
  const series = await PodcastSeries.findById(id);
  if (!series) throw AppError.notFound('Podcast series not found');
  if (data.title && data.title !== series.title) {
    data.slug = slugify(data.title, { lower: true, strict: true });
  }
  Object.assign(series, data);
  await series.save();
  return series;
};

const deleteSeries = async (id) => {
  const series = await PodcastSeries.findById(id);
  if (!series) throw AppError.notFound('Podcast series not found');
  await PodcastEpisode.deleteMany({ seriesId: id });
  await PodcastSeries.findByIdAndDelete(id);
  return { deleted: true };
};

// ─── Episodes ────────────────────────────────────────────

const createEpisode = async (seriesId, data) => {
  const series = await PodcastSeries.findById(seriesId);
  if (!series) throw AppError.notFound('Podcast series not found');

  if (!data.episodeNumber) {
    const last = await PodcastEpisode.findOne({ seriesId }).sort({ episodeNumber: -1 });
    data.episodeNumber = last ? last.episodeNumber + 1 : 1;
  }

  const episode = new PodcastEpisode({ ...data, seriesId });
  await episode.save();

  const count = await PodcastEpisode.countDocuments({ seriesId });
  await PodcastSeries.findByIdAndUpdate(seriesId, { totalEpisodes: count });

  return episode;
};

const getEpisodesBySeries = async (seriesId) => {
  return PodcastEpisode.find({ seriesId }).sort({ episodeNumber: 1 });
};

const updateEpisode = async (id, data) => {
  const episode = await PodcastEpisode.findById(id);
  if (!episode) throw AppError.notFound('Podcast episode not found');
  Object.assign(episode, data);
  await episode.save();
  return episode;
};

const deleteEpisode = async (id) => {
  const episode = await PodcastEpisode.findById(id);
  if (!episode) throw AppError.notFound('Podcast episode not found');
  const seriesId = episode.seriesId;
  await PodcastEpisode.findByIdAndDelete(id);
  const count = await PodcastEpisode.countDocuments({ seriesId });
  await PodcastSeries.findByIdAndUpdate(seriesId, { totalEpisodes: count });
  return { deleted: true };
};

module.exports = {
  createSeries, getAllSeries, getSeriesById, updateSeries, deleteSeries,
  createEpisode, getEpisodesBySeries, updateEpisode, deleteEpisode,
};
