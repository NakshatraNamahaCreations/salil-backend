const mongoose = require('mongoose');

const videoSeriesSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, unique: true },
    description: { type: String, default: '' },
    thumbnail: { type: String, default: '' },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Author',
    },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
    },
    totalVideos: { type: Number, default: 0 },
  },
  { timestamps: true }
);

videoSeriesSchema.index({ slug: 1 }, { unique: true });
videoSeriesSchema.index({ authorId: 1 });

module.exports = mongoose.model('VideoSeries', videoSeriesSchema);
