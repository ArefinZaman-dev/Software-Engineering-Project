const mongoose = require('mongoose');
const { RESOURCE_TYPE } = require('../constants');

// One piece of learning help (a YouTube video, an article, a short note...) that an admin attaches
// to one job, so a student who lacks a required skill can learn it before applying (Increment 8).
const learningResourceSchema = new mongoose.Schema(
  {
    // The job comes from the URL when the admin creates a resource and never changes afterwards.
    job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true, immutable: true },
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 120 },
    type: { type: String, enum: Object.values(RESOURCE_TYPE), required: true },
    // Required for every type except NOTE (checked in the validate hook below).
    url: { type: String, trim: true, maxlength: 500, default: '' },
    // A short explanation of what the student will learn. Required for a NOTE, optional otherwise.
    description: { type: String, trim: true, maxlength: 1000, default: '' },
    // Optional label that says which skill this teaches, e.g. "React basics".
    skill: { type: String, trim: true, maxlength: 40, default: '' },
    // The admin who added it. Kept for accountability but never sent to students.
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (_doc, ret) => {
        delete ret._id;
        delete ret.addedBy;
        return ret;
      },
    },
  }
);

learningResourceSchema.index({ job: 1, createdAt: 1 });

// A second line of defence behind the request validator: even a script that writes straight to the
// database cannot store a link-type resource without a link, or a note without text.
learningResourceSchema.pre('validate', function checkTypeRules() {
  if (this.type === RESOURCE_TYPE.NOTE) {
    if (!this.description) this.invalidate('description', 'A note needs some text in the description.');
  } else if (!this.url) {
    this.invalidate('url', 'This type of resource needs a link.');
  }
});

module.exports = mongoose.model('LearningResource', learningResourceSchema);
