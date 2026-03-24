const podcastService = require('./podcast.service');
const { asyncHandler } = require('../../common/errorHandler');
const { success, created, paginated } = require('../../common/response');

// ─── Series Controllers ──────────────────────────────────

const createSeries = asyncHandler(async (req, res) => {
  const data = { ...req.body };
  if (req.file?.location) data.thumbnail = req.file.location;
  const series = await podcastService.createSeries(data, data.authorId);
  created(res, series, 'Podcast series created');
});

const getAllSeries = asyncHandler(async (req, res) => {
  const result = await podcastService.getAllSeries(req.query);
  paginated(res, { docs: result.series, ...result.pagination });
});

const getSeries = asyncHandler(async (req, res) => {
  const series = await podcastService.getSeriesById(req.params.id);
  success(res, series);
});

const updateSeries = asyncHandler(async (req, res) => {
  const data = { ...req.body };
  if (req.file?.location) data.thumbnail = req.file.location;
  const series = await podcastService.updateSeries(req.params.id, data);
  success(res, series, 'Podcast series updated');
});

const deleteSeries = asyncHandler(async (req, res) => {
  await podcastService.deleteSeries(req.params.id);
  success(res, null, 'Podcast series deleted');
});

// ─── Episode Controllers ─────────────────────────────────

const createEpisode = asyncHandler(async (req, res) => {
  const episode = await podcastService.createEpisode(req.params.seriesId, req.body);
  created(res, episode, 'Episode created');
});

const getEpisodes = asyncHandler(async (req, res) => {
  const episodes = await podcastService.getEpisodesBySeries(req.params.seriesId);
  success(res, episodes);
});

const updateEpisode = asyncHandler(async (req, res) => {
  const episode = await podcastService.updateEpisode(req.params.id, req.body);
  success(res, episode, 'Episode updated');
});

const deleteEpisode = asyncHandler(async (req, res) => {
  await podcastService.deleteEpisode(req.params.id);
  success(res, null, 'Episode deleted');
});

module.exports = {
  createSeries, getAllSeries, getSeries, updateSeries, deleteSeries,
  createEpisode, getEpisodes, updateEpisode, deleteEpisode,
};
