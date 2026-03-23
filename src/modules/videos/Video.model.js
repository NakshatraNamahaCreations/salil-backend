const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema(
  {
    seriesId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VideoSeries',
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    sourceType: {
      type: String,
      enum: ['uploaded_video', 'youtube_link'],
      required: true,
    },
    videoUrl: { type: String, default: '' }, // S3 key
    youtubeUrl: { type: String, default: '' },
    youtubeMeta: {
      videoId: { type: String, default: '' },
      thumbnailUrl: { type: String, default: '' },
      channelName: { type: String, default: '' },
      duration: { type: Number, default: 0 },
    },
    thumbnail: { type: String, default: '' },
    duration: { type: Number, default: 0 },
    isFree: { type: Boolean, default: false },
    coinCost: { type: Number, default: 0, min: 0 },
    isTrailer: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'published', 'archived'],
      default: 'draft',
    },
    scheduledAt: { type: Date },
    publishedAt: { type: Date },
    viewCount: { type: Number, default: 0 },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Author',
    },
  },
  { timestamps: true }
);

videoSchema.index({ seriesId: 1 });
videoSchema.index({ authorId: 1 });
videoSchema.index({ status: 1 });
videoSchema.index({ title: 'text', description: 'text' });

module.exports = mongoose.model('Video', videoSchema);
