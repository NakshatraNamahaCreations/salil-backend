const mongoose = require('mongoose');

const tagSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true, lowercase: true },
    slug: { type: String, unique: true },
    usageCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

tagSchema.index({ name: 1 }, { unique: true });
tagSchema.index({ slug: 1 }, { unique: true });

module.exports = mongoose.model('Tag', tagSchema);
