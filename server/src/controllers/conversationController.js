const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const conversationService = require('../services/conversationService');

const open = asyncHandler(async (req, res) => {
  const { conversation, created } = await conversationService.openConversation(req.user, req.params.id);
  sendSuccess(res, { conversation }, { status: created ? 201 : 200 });
});

const list = asyncHandler(async (req, res) => {
  const conversations = await conversationService.listConversations(req.user);
  sendSuccess(res, { conversations });
});

const messages = asyncHandler(async (req, res) => {
  const result = await conversationService.getMessages(req.user, req.params.id);
  sendSuccess(res, result);
});

const send = asyncHandler(async (req, res) => {
  const message = await conversationService.sendMessage(req.user, req.params.id, req.body.body);
  sendSuccess(res, { message }, { status: 201 });
});

module.exports = { open, list, messages, send };
