const mongoose = require('mongoose');
const slugify = require('slugify');

const podcastSeriesSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, unique: true },
    description: { type: String, default: '' },
    thumbnail: { type: String, default: '' },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Author',
      required: true,
    },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    tags: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tag' }],
    isPublished: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
    totalEpisodes: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

podcastSeriesSchema.index({ slug: 1 }, { unique: true });
podcastSeriesSchema.index({ authorId: 1 });
podcastSeriesSchema.index({ categoryId: 1 });
podcastSeriesSchema.index({ title: 'text', description: 'text' });

podcastSeriesSchema.pre('save', function (next) {
  if (this.isModified('title')) {
    this.slug = slugify(this.title, { lower: true, strict: true }) + '-' + Date.now().toString(36);
  }
  next();
});

podcastSeriesSchema.virtual('episodes', {
  ref: 'PodcastEpisode',
  localField: '_id',
  foreignField: 'seriesId',
  options: { sort: { episodeNumber: 1 } },
});

module.exports = mongoose.model('PodcastSeries', podcastSeriesSchema);
