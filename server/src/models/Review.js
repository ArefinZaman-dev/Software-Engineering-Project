const mongoose = require('mongoose');
const { REVIEW_COMMENT_MAX_LENGTH } = require('../constants');

const reviewSchema = new mongoose.Schema(
  {
    job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true, immutable: true },
    // The accepted application the review is about. Kept so a review can always be traced back
    // to the exact hire it belongs to.
    application: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', required: true, immutable: true },
    reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
    reviewee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      validate: { validator: Number.isInteger, message: 'Rating must be a whole number from 1 to 5.' },
    },
    comment: { type: String, trim: true, maxlength: REVIEW_COMMENT_MAX_LENGTH, default: '' },
    // Admin moderation flag (Increment 6). A removed review is excluded from lists AND from the
    // reviewee's rating summary (DECISIONS B5).
    removedByAdmin: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    // virtuals: true is what makes `id` appear in API responses (see bug fix BF1).
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (_doc, ret) => {
        delete ret._id;
        // Populated users/jobs go through their own toJSON first; strip derived or private
        // fields that would be misleading on a partially loaded document.
        [ret.reviewer, ret.reviewee].forEach((person) => {
          if (person && typeof person === 'object') {
            delete person.status;
            delete person.profileCompletion;
          }
        });
        if (ret.job && typeof ret.job === 'object') delete ret.job.isPastDeadline;
        return ret;
      },
    },
  }
);

// One review per direction per job: the poster reviews the student once, the student reviews
// the poster once. Database-level guarantee; reviewService checks first for a friendly message.
reviewSchema.index({ job: 1, reviewer: 1 }, { unique: true });
reviewSchema.index({ reviewee: 1, createdAt: -1 });

module.exports = mongoose.model('Review', reviewSchema);
