const Video = require('./Video.model');
const VideoSeries = require('./VideoSeries.model');
const AppError = require('../../common/AppError');

const createVideo = async (data) => {
  const video = new Video(data);
  await video.save();
  if (data.seriesId) {
    const count = await Video.countDocuments({ seriesId: data.seriesId });
    await VideoSeries.findByIdAndUpdate(data.seriesId, { totalVideos: count });
  }
  return video;
};

const getVideos = async ({ page = 1, limit = 20, search, status, authorId, seriesId }) => {
  const query = {};
  if (search) query.$or = [{ title: { $regex: search, $options: 'i' } }];
  if (status) query.status = status;
  if (authorId) query.authorId = authorId;
  if (seriesId) query.seriesId = seriesId;

  const skip = (page - 1) * limit;
  const [videos, total] = await Promise.all([
    Video.find(query)
      .populate('authorId', 'displayName avatar')
      .populate('seriesId', 'title')
      .sort({ createdAt: -1 })
      .skip(skip).limit(limit).lean(),
    Video.countDocuments(query),
  ]);
  return { videos, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
};

const getVideoById = async (id) => {
  const video = await Video.findById(id)
    .populate('authorId', 'displayName avatar')
    .populate('seriesId', 'title');
  if (!video) throw AppError.notFound('Video not found');
  return video;
};

const updateVideo = async (id, data) => {
  const video = await Video.findById(id);
  if (!video) throw AppError.notFound('Video not found');
  Object.assign(video, data);
  await video.save();
  return video;
};

const deleteVideo = async (id) => {
  const video = await Video.findById(id);
  if (!video) throw AppError.notFound('Video not found');
  video.status = 'archived';
  await video.save();
  if (video.seriesId) {
    const count = await Video.countDocuments({ seriesId: video.seriesId, status: { $ne: 'archived' } });
    await VideoSeries.findByIdAndUpdate(video.seriesId, { totalVideos: count });
  }
  return video;
};

// ─── Video Series ────────────────────────────────────────

const createVideoSeries = async (data) => {
  const series = new VideoSeries(data);
  await series.save();
  return series;
};

const getVideoSeriesList = async ({ page = 1, limit = 20 }) => {
  const skip = (page - 1) * limit;
  const [series, total] = await Promise.all([
    VideoSeries.find().populate('authorId', 'displayName avatar').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    VideoSeries.countDocuments(),
  ]);
  return { series, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
};

const updateVideoSeries = async (id, data) => {
  const series = await VideoSeries.findById(id);
  if (!series) throw AppError.notFound('Video series not found');
  Object.assign(series, data);
  await series.save();
  return series;
};

module.exports = {
  createVideo, getVideos, getVideoById, updateVideo, deleteVideo,
  createVideoSeries, getVideoSeriesList, updateVideoSeries,
};
