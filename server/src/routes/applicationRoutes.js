const express = require('express');
const applicationController = require('../controllers/applicationController');
const conversationController = require('../controllers/conversationController');
const authenticate = require('../middleware/authenticate');
const { authorizeRoles } = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { idParamSchema } = require('../validators/common');
const { ROLES } = require('../constants');

const router = express.Router();

// Every application route requires a logged-in user; role is checked per-route below.
router.use(authenticate);

router.get('/mine', authorizeRoles(ROLES.STUDENT), applicationController.mine);

router.post(
  '/:id/shortlist',
  authorizeRoles(ROLES.POSTER),
  validate(idParamSchema, 'params'),
  applicationController.shortlist
);
router.post(
  '/:id/reject',
  authorizeRoles(ROLES.POSTER),
  validate(idParamSchema, 'params'),
  applicationController.reject
);
router.post(
  '/:id/accept',
  authorizeRoles(ROLES.POSTER),
  validate(idParamSchema, 'params'),
  applicationController.accept
);
router.post(
  '/:id/withdraw',
  authorizeRoles(ROLES.STUDENT),
  validate(idParamSchema, 'params'),
  applicationController.withdraw
);

// Either person on an application (the job's poster or the applicant) can open its conversation.
router.post(
  '/:id/conversation',
  authorizeRoles(ROLES.STUDENT, ROLES.POSTER),
  validate(idParamSchema, 'params'),
  conversationController.open
);

module.exports = router;
