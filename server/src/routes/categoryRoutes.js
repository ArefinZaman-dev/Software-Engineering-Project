const express = require('express');
const categoryController = require('../controllers/categoryController');

const router = express.Router();

// Public: needed on the (public) browse-jobs page and the job-creation form.
router.get('/', categoryController.list);

module.exports = router;
