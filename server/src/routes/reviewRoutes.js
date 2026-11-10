const express = require('express');
const reviewController = require('../controllers/reviewController');
const authenticate = require('../middleware/authenticate');
const validate = require('../middleware/validate');
const { idParamSchema } = require('../validators/common');

const router = express.Router();

// Writing a review and reading the two reviews of one job live under /api/jobs/:id/reviews
// (see jobRoutes.js). This file only holds the per-user listing, shown on public profiles.
router.get('/user/:id', authenticate, validate(idParamSchema, 'params'), reviewController.listForUser);

module.exports = router;
