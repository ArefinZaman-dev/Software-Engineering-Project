const mongoose = require('mongoose');
const { APPLICATION_STATUS, WITHDRAWN_BY } = require('../constants');

const applicationSchema = new mongoose.Schema(
  {
    job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true, immutable: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
    coverMessage: { type: String, required: true, trim: true, minlength: 10, maxlength: 1000 },
    // Optional: the student's own proposed amount. The job's `budget` is what the poster set;
    // bidding is not a V1 workflow (see Section 33), this is just a number the student can share.
    proposedAmount: { type: Number, min: 1, max: 10_000_000, default: null },
    status: { type: String, enum: Object.values(APPLICATION_STATUS), default: APPLICATION_STATUS.PENDING },
    // Only meaningful when status is WITHDRAWN - see constants/index.js.
    withdrawnBy: { type: String, enum: Object.values(WITHDRAWN_BY), default: null },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (_doc, ret) => {
        delete ret._id;
        if (ret.student && typeof ret.student === 'object') delete ret.student.status;
        return ret;
      },
    },
  }
);

// One application per student per job, ever - a withdrawn application cannot be re-submitted
// (Section 33). This is the database-level guarantee; applicationService also checks it first
// to give a friendly error message.
applicationSchema.index({ job: 1, student: 1 }, { unique: true });
applicationSchema.index({ job: 1, status: 1 });
applicationSchema.index({ student: 1, createdAt: -1 });

module.exports = mongoose.model('Application', applicationSchema);
