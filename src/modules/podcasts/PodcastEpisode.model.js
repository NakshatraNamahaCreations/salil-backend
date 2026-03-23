const mongoose = require('mongoose');

const podcastEpisodeSchema = new mongoose.Schema(
  {
    seriesId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PodcastSeries',
      required: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    episodeNumber: { type: Number, required: true },
    sourceType: {
      type: String,
      enum: ['uploaded_audio', 'youtube_link'],
      required: true,
    },
    audioUrl: { type: String, default: '' }, // S3 key for uploaded audio
    youtubeUrl: { type: String, default: '' },
    youtubeMeta: {
      videoId: { type: String, default: '' },
      thumbnailUrl: { type: String, default: '' },
      channelName: { type: String, default: '' },
      duration: { type: Number, default: 0 },
    },
    thumbnail: { type: String, default: '' },
    duration: { type: Number, default: 0 }, // seconds
    isFree: { type: Boolean, default: false },
    coinCost: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'published', 'archived'],
      default: 'draft',
    },
    scheduledAt: { type: Date },
    publishedAt: { type: Date },
    playCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

podcastEpisodeSchema.index({ seriesId: 1, episodeNumber: 1 });
podcastEpisodeSchema.index({ status: 1 });
podcastEpisodeSchema.index({ scheduledAt: 1 });

module.exports = mongoose.model('PodcastEpisode', podcastEpisodeSchema);
