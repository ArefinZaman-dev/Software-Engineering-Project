const Report = require('../models/Report');
const AppError = require('../utils/AppError');
const { REPORT_STATUS, REPORT_ACTIVE_STATUSES, REPORT_TARGET } = require('../constants');

// What an admin may do with a report, and from which statuses.
const ACTIONS = {
  review: { from: [REPORT_STATUS.PENDING], to: REPORT_STATUS.REVIEWING, error: 'Only a pending report can be moved to reviewing.' },
  resolve: { from: REPORT_ACTIVE_STATUSES, to: REPORT_STATUS.RESOLVED, error: 'This report has already been closed.' },
  dismiss: { from: REPORT_ACTIVE_STATUSES, to: REPORT_STATUS.DISMISSED, error: 'This report has already been closed.' },
};

const populateReport = (query) =>
  query
    .populate('reporter', 'name email')
    .populate('targetJob', 'title removedByAdmin')
    .populate('targetUser', 'name email role status')
    .populate('resolvedBy', 'name');

function toAdminReport(report) {
  const isJob = report.targetType === REPORT_TARGET.JOB;
  const job = report.targetJob;
  const user = report.targetUser;

  // The target may have been deleted since (a poster can delete an open job with no applicants),
  // so every field is read defensively.
  const target = isJob
    ? { kind: REPORT_TARGET.JOB, id: job ? job.id : null, label: job ? job.title : '(deleted job)', removedByAdmin: job ? job.removedByAdmin : null }
    : { kind: REPORT_TARGET.USER, id: user ? user.id : null, label: user ? user.name : '(deleted user)', email: user ? user.email : null, status: user ? user.status : null };

  return {
    id: report.id,
    targetType: report.targetType,
    reason: report.reason,
    description: report.description,
    status: report.status,
    resolutionNote: report.resolutionNote,
    resolvedAt: report.resolvedAt,
    resolvedBy: report.resolvedBy ? { id: report.resolvedBy.id, name: report.resolvedBy.name } : null,
    createdAt: report.createdAt,
    reporter: report.reporter ? { id: report.reporter.id, name: report.reporter.name, email: report.reporter.email } : null,
    target,
  };
}

async function listReports(query) {
  const filter = {};
  if (query.status === 'OPEN') filter.status = { $in: REPORT_ACTIVE_STATUSES };
  else if (query.status) filter.status = query.status;

  const [reports, total] = await Promise.all([
    populateReport(Report.find(filter).sort({ createdAt: -1 }).skip((query.page - 1) * query.limit).limit(query.limit)),
    Report.countDocuments(filter),
  ]);

  return {
    reports: reports.map(toAdminReport),
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.max(1, Math.ceil(total / query.limit)) },
  };
}

// Status changes go through document.save() on purpose: the pre-save hook on Report keeps
// `isActive` in step with `status`, which is what frees the reporter to report the same target
// again once this one is closed (DECISIONS D40).
async function changeReport(admin, reportId, actionName, note) {
  const action = ACTIONS[actionName];
  const report = await Report.findById(reportId);
  if (!report) throw new AppError('Report not found.', 404);
  if (!action.from.includes(report.status)) throw new AppError(action.error, 409);

  report.status = action.to;
  if (actionName !== 'review') {
    report.resolvedBy = admin._id;
    report.resolvedAt = new Date();
    report.resolutionNote = note || '';
  }
  await report.save();

  return toAdminReport(await populateReport(Report.findById(report._id)));
}

module.exports = {
  listReports,
  startReview: (admin, id) => changeReport(admin, id, 'review'),
  resolveReport: (admin, id, note) => changeReport(admin, id, 'resolve', note),
  dismissReport: (admin, id, note) => changeReport(admin, id, 'dismiss', note),
};
