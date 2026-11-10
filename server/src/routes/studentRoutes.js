const express = require('express');
const studentController = require('../controllers/studentController');
const authenticate = require('../middleware/authenticate');
const { authorizeRoles, requireSelf } = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { idParamSchema } = require('../validators/common');
const { updateStudentSchema } = require('../validators/profileValidators');
const { ROLES } = require('../constants');

const router = express.Router();

router.use(authenticate);

router.get('/:id', validate(idParamSchema, 'params'), studentController.getProfile);

// Order matters: role check, then id format, then "is this my own profile?", then body validation.
router.put(
  '/:id',
  authorizeRoles(ROLES.STUDENT),
  validate(idParamSchema, 'params'),
  requireSelf('id'),
  validate(updateStudentSchema),
  studentController.updateProfile
);

module.exports = router;
