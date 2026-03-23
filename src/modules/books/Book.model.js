const mongoose = require('mongoose');
const slugify = require('slugify');

const bookSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, unique: true },
    description: { type: String, default: '' },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Author',
      required: true,
    },
    coverImage: { type: String, default: '' },
    genres: [{ type: String, trim: true }],
    tags: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tag' }],
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    bookLanguage: { type: String, default: 'English' },
    contentType: {
      type: String,
      enum: ['ebook', 'audiobook'],
      default: 'ebook',
    },
    isFree: { type: Boolean, default: true },
    ebookPrice: { type: Number, default: 0 },
    audiobookPrice: { type: Number, default: 0 },
    comboPrice: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
    },
    isPublished: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
    totalChapters: { type: Number, default: 0 },
    totalReads: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    publishedAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

bookSchema.index({ slug: 1 }, { unique: true });
bookSchema.index({ authorId: 1 });
bookSchema.index({ status: 1 });
bookSchema.index({ categoryId: 1 });
bookSchema.index({ isFeatured: 1 });
bookSchema.index({ title: 'text', description: 'text' }, { default_language: 'none' });

// Auto-generate slug from title
bookSchema.pre('save', function (next) {
  if (this.isModified('title')) {
    let slug = slugify(this.title, { lower: true, strict: true, trim: true });
    if (!slug) slug = 'book';
    this.slug = slug + '-' + Date.now().toString(36);
  }
  next();
});

// Virtual: chapters
bookSchema.virtual('chapters', {
  ref: 'Chapter',
  localField: '_id',
  foreignField: 'bookId',
  options: { sort: { orderNumber: 1 } },
});

module.exports = mongoose.model('Book', bookSchema);
