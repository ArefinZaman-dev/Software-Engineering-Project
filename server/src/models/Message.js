const mongoose = require('mongoose');
const { MESSAGE_MAX_LENGTH } = require('../constants');

const messageSchema = new mongoose.Schema(
  {
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true, immutable: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
    body: { type: String, required: true, trim: true, minlength: 1, maxlength: MESSAGE_MAX_LENGTH },
    // null until the other participant opens the conversation.
    readAt: { type: Date, default: null },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
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

messageSchema.index({ conversation: 1, createdAt: 1 });

module.exports = mongoose.model('Message', messageSchema);
