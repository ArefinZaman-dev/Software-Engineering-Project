const express = require('express');
const conversationController = require('../controllers/conversationController');
const authenticate = require('../middleware/authenticate');
const { authorizeRoles } = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { idParamSchema } = require('../validators/common');
const { sendMessageSchema } = require('../validators/messageValidators');
const { ROLES } = require('../constants');

const router = express.Router();

// Only students and posters have conversations. Opening one is POST /api/applications/:id/conversation.
router.use(authenticate, authorizeRoles(ROLES.STUDENT, ROLES.POSTER));

router.get('/', conversationController.list);
router.get('/:id/messages', validate(idParamSchema, 'params'), conversationController.messages);
router.post(
  '/:id/messages',
  validate(idParamSchema, 'params'),
  validate(sendMessageSchema),
  conversationController.send
);

module.exports = router;
