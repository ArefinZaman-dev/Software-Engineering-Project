const mongoose = require('mongoose');
const { JOB_STATUS, WORK_TYPE } = require('../constants');

const jobSchema = new mongoose.Schema(
  {
    poster: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
    title: { type: String, required: true, trim: true, minlength: 5, maxlength: 120 },
    description: { type: String, required: true, trim: true, minlength: 20, maxlength: 5000 },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    skills: { type: [{ type: String, trim: true, maxlength: 40 }], default: [] },
    budget: { type: Number, required: true, min: 1, max: 10_000_000 },
    // Free text ("3 days", "2 weeks", "One-time, ~4 hours") rather than a rigid unit, because
    // jobs range from a single errand to a multi-week project.
    duration: { type: String, required: true, trim: true, maxlength: 60 },
    location: { type: String, required: true, trim: true, maxlength: 100 },
    workType: { type: String, enum: Object.values(WORK_TYPE), required: true },
    deadline: { type: Date, required: true },
    status: { type: String, enum: Object.values(JOB_STATUS), default: JOB_STATUS.OPEN },
    // Set only once, when the poster accepts an application (Increment 4). Never set directly.
    acceptedApplication: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', default: null },
    // Admin moderation flag (Increment 6). A hidden job is not a new status (see DECISIONS B1);
    // it is excluded from discovery regardless of status.
    removedByAdmin: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (_doc, ret) => {
        delete ret._id;
        // If `poster` was populated, it went through User's own toJSON transform (which already
        // strips passwordHash and _id) but "status" is intentionally not public - strip it here
        // too, so a job listing never reveals whether the poster's account is suspended.
        if (ret.poster && typeof ret.poster === 'object') delete ret.poster.status;
        return ret;
      },
    },
  }
);

// Deadline must be in the future when a job is created. (Not enforced on every save, because a
// job created with a future deadline naturally becomes "past deadline" as time passes; that
// case is handled by application logic, not by rejecting the job itself. See jobValidators.js
// for the creation-time check.)

jobSchema.index({ status: 1, createdAt: -1 });
jobSchema.index({ category: 1 });
jobSchema.index({ poster: 1, createdAt: -1 });
jobSchema.index({ title: 'text', description: 'text' });

jobSchema.virtual('isPastDeadline').get(function isPastDeadline() {
  return this.deadline < new Date();
});

module.exports = mongoose.model('Job', jobSchema);
