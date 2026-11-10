const express = require('express');
const adminController = require('../controllers/adminController');
const authenticate = require('../middleware/authenticate');
const { authorizeRoles } = require('../middleware/authorize');
const { ROLES } = require('../constants');

const router = express.Router();

// Every admin route requires a logged-in ADMIN.
router.use(authenticate, authorizeRoles(ROLES.ADMIN));

router.get('/stats', adminController.getStats);

module.exports = router;
