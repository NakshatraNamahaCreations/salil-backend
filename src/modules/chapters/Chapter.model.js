const mongoose = require('mongoose');

const chapterSchema = new mongoose.Schema(
  {
    bookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Book',
      required: true,
    },
    title: { type: String, required: true, trim: true },
    orderNumber: { type: Number, required: true },
    sourceType: {
      type: String,
      enum: ['richtext', 'pdf'],
      default: 'richtext',
    },
    rawPdfUrl: { type: String, default: '' },
    contentHtml: { type: String, default: '' },
    contentPreview: { type: String, default: '' },
    isFree: { type: Boolean, default: false },
    coinCost: { type: Number, default: 0, min: 0 },
    wordCount: { type: Number, default: 0 },
    estimatedReadTime: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'published', 'archived'],
      default: 'draft',
    },
    scheduledAt: { type: Date },
    publishedAt: { type: Date },
    readCount: { type: Number, default: 0 },
    conversionStatus: {
      type: String,
      enum: ['none', 'processing', 'completed', 'failed'],
      default: 'none',
    },
    conversionError: { type: String, default: '' },
  },
  { timestamps: true }
);

chapterSchema.index({ bookId: 1, orderNumber: 1 });
chapterSchema.index({ status: 1 });
chapterSchema.index({ scheduledAt: 1 });

// Auto-generate content preview
chapterSchema.pre('save', function (next) {
  if (this.isModified('contentHtml') && this.contentHtml) {
    const stripped = this.contentHtml.replace(/<[^>]+>/g, '');
    this.contentPreview = stripped.substring(0, 200);
    // Approximate word count
    this.wordCount = stripped.split(/\s+/).filter(Boolean).length;
    this.estimatedReadTime = Math.ceil(this.wordCount / 200); // 200 wpm
  }
  next();
});

module.exports = mongoose.model('Chapter', chapterSchema);
