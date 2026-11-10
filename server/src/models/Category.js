const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true, maxlength: 60 },
    // URL-friendly version of the name, used if a future page links to /jobs?category=slug.
    slug: { type: String, required: true, trim: true, unique: true, lowercase: true, maxlength: 60 },
    // Deactivated instead of deleted when jobs reference it (see DECISIONS.md).
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (_doc, ret) => {
        delete ret._id;
        return ret;
      },
    },
  }
);

categorySchema.statics.slugify = function slugify(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

module.exports = mongoose.model('Category', categorySchema);
