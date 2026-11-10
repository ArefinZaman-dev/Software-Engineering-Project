const express = require('express');
const reportController = require('../controllers/reportController');
const authenticate = require('../middleware/authenticate');
const { authorizeRoles } = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { createReportSchema } = require('../validators/reportValidators');
const { ROLES } = require('../constants');

const router = express.Router();

router.post(
  '/',
  authenticate,
  authorizeRoles(ROLES.STUDENT, ROLES.POSTER),
  validate(createReportSchema),
  reportController.create
);

module.exports = router;
