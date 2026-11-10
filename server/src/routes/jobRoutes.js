const express = require('express');
const jobController = require('../controllers/jobController');
const authenticate = require('../middleware/authenticate');
const { authorizeRoles } = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { idParamSchema } = require('../validators/common');
const { createJobSchema, updateJobSchema, listJobsQuerySchema } = require('../validators/jobValidators');
const { applySchema } = require('../validators/applicationValidators');
const applicationController = require('../controllers/applicationController');
const reviewController = require('../controllers/reviewController');
const { createReviewSchema } = require('../validators/reviewValidators');
const { ROLES } = require('../constants');

const router = express.Router();

// Public: browsing and job details (Section 4 - "Public pages: ... Browse Jobs, Job Details").
router.get('/', validate(listJobsQuerySchema, 'query'), jobController.list);

// Must come before "/:id" or Express would try to treat "mine" as an id.
router.get('/mine', authenticate, authorizeRoles(ROLES.POSTER), jobController.mine);

router.get('/:id', validate(idParamSchema, 'params'), jobController.getOne);

router.post('/', authenticate, authorizeRoles(ROLES.POSTER), validate(createJobSchema), jobController.create);

router.put(
  '/:id',
  authenticate,
  authorizeRoles(ROLES.POSTER),
  validate(idParamSchema, 'params'),
  validate(updateJobSchema),
  jobController.update
);

router.delete(
  '/:id',
  authenticate,
  authorizeRoles(ROLES.POSTER),
  validate(idParamSchema, 'params'),
  jobController.remove
);

router.post(
  '/:id/close',
  authenticate,
  authorizeRoles(ROLES.POSTER),
  validate(idParamSchema, 'params'),
  jobController.close
);

router.post(
  '/:id/cancel',
  authenticate,
  authorizeRoles(ROLES.POSTER),
  validate(idParamSchema, 'params'),
  jobController.cancel
);

router.post(
  '/:id/complete',
  authenticate,
  authorizeRoles(ROLES.POSTER),
  validate(idParamSchema, 'params'),
  jobController.complete
);

// Job-scoped review endpoints: only the job's two participants, and only once it is completed.
router.get(
  '/:id/reviews',
  authenticate,
  authorizeRoles(ROLES.STUDENT, ROLES.POSTER),
  validate(idParamSchema, 'params'),
  reviewController.listForJob
);

router.post(
  '/:id/reviews',
  authenticate,
  authorizeRoles(ROLES.STUDENT, ROLES.POSTER),
  validate(idParamSchema, 'params'),
  validate(createReviewSchema),
  reviewController.create
);

// Job-scoped application endpoints: apply to this job, or (as its poster) see who applied.
router.post(
  '/:id/applications',
  authenticate,
  authorizeRoles(ROLES.STUDENT),
  validate(idParamSchema, 'params'),
  validate(applySchema),
  applicationController.apply
);

router.get(
  '/:id/applications',
  authenticate,
  authorizeRoles(ROLES.POSTER),
  validate(idParamSchema, 'params'),
  applicationController.listForJob
);

module.exports = router;
