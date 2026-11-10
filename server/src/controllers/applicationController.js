const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const applicationService = require('../services/applicationService');

const apply = asyncHandler(async (req, res) => {
  const application = await applicationService.apply(req.user, req.params.id, req.body);
  sendSuccess(res, { application }, { status: 201, message: 'Application submitted.' });
});

const listForJob = asyncHandler(async (req, res) => {
  const applications = await applicationService.listApplicantsForJob(req.user, req.params.id);
  sendSuccess(res, { applications });
});

const mine = asyncHandler(async (req, res) => {
  const applications = await applicationService.listMyApplications(req.user);
  sendSuccess(res, { applications });
});

const shortlist = asyncHandler(async (req, res) => {
  const application = await applicationService.shortlist(req.user, req.params.id);
  sendSuccess(res, { application }, { message: 'Applicant shortlisted.' });
});

const reject = asyncHandler(async (req, res) => {
  const application = await applicationService.reject(req.user, req.params.id);
  sendSuccess(res, { application }, { message: 'Application rejected.' });
});

const accept = asyncHandler(async (req, res) => {
  const application = await applicationService.accept(req.user, req.params.id);
  sendSuccess(res, { application }, { message: 'Applicant accepted. The job is now in progress.' });
});

const withdraw = asyncHandler(async (req, res) => {
  const application = await applicationService.withdraw(req.user, req.params.id);
  sendSuccess(res, { application }, { message: 'Application withdrawn.' });
});

module.exports = { apply, listForJob, mine, shortlist, reject, accept, withdraw };
