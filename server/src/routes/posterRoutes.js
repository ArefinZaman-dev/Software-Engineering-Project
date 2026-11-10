const express = require('express');
const posterController = require('../controllers/posterController');
const authenticate = require('../middleware/authenticate');
const { authorizeRoles, requireSelf } = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { idParamSchema } = require('../validators/common');
const { updatePosterSchema } = require('../validators/profileValidators');
const { ROLES } = require('../constants');

const router = express.Router();

router.use(authenticate);

router.get('/:id', validate(idParamSchema, 'params'), posterController.getProfile);

// Order matters: role check, then id format, then "is this my own profile?", then body validation.
router.put(
  '/:id',
  authorizeRoles(ROLES.POSTER),
  validate(idParamSchema, 'params'),
  requireSelf('id'),
  validate(updatePosterSchema),
  posterController.updateProfile
);

module.exports = router;
