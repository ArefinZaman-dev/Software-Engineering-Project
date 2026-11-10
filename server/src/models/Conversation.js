const mongoose = require('mongoose');

// One conversation per application, between that job's poster and the applicant.
const conversationSchema = new mongoose.Schema(
  {
    job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true, immutable: true },
    application: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', required: true, immutable: true },
    poster: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
    lastMessageAt: { type: Date, default: Date.now },
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

conversationSchema.index({ application: 1 }, { unique: true });
conversationSchema.index({ poster: 1, lastMessageAt: -1 });
conversationSchema.index({ student: 1, lastMessageAt: -1 });

module.exports = mongoose.model('Conversation', conversationSchema);
