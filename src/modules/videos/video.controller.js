const videoService = require('./video.service');
const { asyncHandler } = require('../../common/errorHandler');
const { success, created, paginated } = require('../../common/response');

const createVideo = asyncHandler(async (req, res) => {
  const video = await videoService.createVideo(req.body);
  created(res, video, 'Video created');
});

const getVideos = asyncHandler(async (req, res) => {
  const result = await videoService.getVideos(req.query);
  paginated(res, { docs: result.videos, ...result.pagination });
});

const getVideo = asyncHandler(async (req, res) => {
  const video = await videoService.getVideoById(req.params.id);
  success(res, video);
});

const updateVideo = asyncHandler(async (req, res) => {
  const video = await videoService.updateVideo(req.params.id, req.body);
  success(res, video, 'Video updated');
});

const deleteVideo = asyncHandler(async (req, res) => {
  await videoService.deleteVideo(req.params.id);
  success(res, null, 'Video archived');
});

const createSeries = asyncHandler(async (req, res) => {
  const series = await videoService.createVideoSeries(req.body);
  created(res, series, 'Video series created');
});

const getSeriesList = asyncHandler(async (req, res) => {
  const result = await videoService.getVideoSeriesList(req.query);
  paginated(res, { docs: result.series, ...result.pagination });
});

const updateSeries = asyncHandler(async (req, res) => {
  const series = await videoService.updateVideoSeries(req.params.id, req.body);
  success(res, series, 'Video series updated');
});

module.exports = { createVideo, getVideos, getVideo, updateVideo, deleteVideo, createSeries, getSeriesList, updateSeries };
