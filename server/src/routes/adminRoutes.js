const express = require('express');
const adminController = require('../controllers/adminController');
const authenticate = require('../middleware/authenticate');
const { authorizeRoles } = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { idParamSchema } = require('../validators/common');
const schemas = require('../validators/adminValidators');
const { ROLES } = require('../constants');

const router = express.Router();

// Every admin route requires a logged-in ADMIN.
router.use(authenticate, authorizeRoles(ROLES.ADMIN));

const withId = validate(idParamSchema, 'params');

router.get('/stats', adminController.getStats);

// Users
router.get('/users', validate(schemas.listUsersQuerySchema, 'query'), adminController.listUsers);
router.post('/users/:id/suspend', withId, adminController.suspendUser);
router.post('/users/:id/reactivate', withId, adminController.reactivateUser);

// Jobs
router.get('/jobs', validate(schemas.listJobsQuerySchema, 'query'), adminController.listJobs);
router.post('/jobs/:id/remove', withId, adminController.removeJob);
router.post('/jobs/:id/restore', withId, adminController.restoreJob);

// Reviews
router.get('/reviews', validate(schemas.listReviewsQuerySchema, 'query'), adminController.listReviews);
router.post('/reviews/:id/remove', withId, adminController.removeReview);
router.post('/reviews/:id/restore', withId, adminController.restoreReview);

// Reports
router.get('/reports', validate(schemas.listReportsQuerySchema, 'query'), adminController.listReports);
router.post('/reports/:id/review', withId, adminController.startReportReview);
router.post('/reports/:id/resolve', withId, validate(schemas.resolveReportSchema), adminController.resolveReport);
router.post('/reports/:id/dismiss', withId, validate(schemas.resolveReportSchema), adminController.dismissReport);

// Categories
router.get('/categories', adminController.listCategories);
router.post('/categories', validate(schemas.createCategorySchema), adminController.createCategory);
router.patch('/categories/:id', withId, validate(schemas.updateCategorySchema), adminController.updateCategory);
router.delete('/categories/:id', withId, adminController.deleteCategory);

module.exports = router;
