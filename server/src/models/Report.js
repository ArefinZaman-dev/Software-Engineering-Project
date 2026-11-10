const mongoose = require('mongoose');
const { REPORT_TARGET, REPORT_REASON, REPORT_STATUS, REPORT_ACTIVE_STATUSES } = require('../constants');

const reportSchema = new mongoose.Schema(
  {
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
    targetType: { type: String, enum: Object.values(REPORT_TARGET), required: true, immutable: true },
    // Exactly one of these is set, matching targetType.
    targetJob: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', immutable: true },
    targetUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', immutable: true },
    reason: { type: String, enum: Object.values(REPORT_REASON), required: true },
    description: { type: String, trim: true, maxlength: 1000, default: '' },
    status: { type: String, enum: Object.values(REPORT_STATUS), default: REPORT_STATUS.PENDING },
    // Filled in by an admin in Increment 6.
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    resolutionNote: { type: String, trim: true, maxlength: 1000, default: '' },
    resolvedAt: { type: Date, default: null },
    // Derived from `status` on every save() (see the hook below). It exists only so the partial
    // unique index can say "one ACTIVE report per reporter and target".
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (_doc, ret) => {
        delete ret._id;
        delete ret.isActive;
        return ret;
      },
    },
  }
);

// Keep isActive in step with status. NOTE for Increment 6: changing a report's status must go
// through document.save() (not updateOne), or this hook will not run.
reportSchema.pre('save', function syncIsActive(next) {
  this.isActive = REPORT_ACTIVE_STATUSES.includes(this.status);
  next();
});

// A reporter cannot have two ACTIVE reports against the same target. Once an admin resolves or
// dismisses the first one, the same person may report again.
reportSchema.index(
  { reporter: 1, targetType: 1, targetJob: 1, targetUser: 1 },
  { unique: true, partialFilterExpression: { isActive: true } }
);
reportSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Report', reportSchema);
