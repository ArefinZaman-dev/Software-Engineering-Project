// Single source of truth for fixed values used by models, validators, and the frontend contract.

const ROLES = Object.freeze({
  STUDENT: 'STUDENT',
  POSTER: 'POSTER',
  ADMIN: 'ADMIN',
});

// Roles that a person may choose during public registration. ADMIN is seed-only.
const REGISTRABLE_ROLES = Object.freeze([ROLES.STUDENT, ROLES.POSTER]);

const USER_STATUS = Object.freeze({
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
});

const AVAILABILITY = Object.freeze({
  FLEXIBLE: 'FLEXIBLE',
  WEEKDAYS: 'WEEKDAYS',
  WEEKENDS: 'WEEKENDS',
  EVENINGS: 'EVENINGS',
  NOT_AVAILABLE: 'NOT_AVAILABLE',
});

const ORGANIZATION_TYPES = Object.freeze({
  INDIVIDUAL: 'INDIVIDUAL',
  BUSINESS: 'BUSINESS',
  ORGANIZATION: 'ORGANIZATION',
});

const JOB_STATUS = Object.freeze({
  OPEN: 'OPEN',
  CLOSED: 'CLOSED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
});

// Statuses that keep a job out of public discovery (poster still sees it on "My Jobs").
const JOB_FINAL_STATUSES = Object.freeze([JOB_STATUS.COMPLETED, JOB_STATUS.CANCELLED]);

const WORK_TYPE = Object.freeze({
  REMOTE: 'REMOTE',
  ON_SITE: 'ON_SITE',
  HYBRID: 'HYBRID',
});

// Fixed category list from the project brief (Section 3.E). Seeded once; admin can rename /
// deactivate later (Increment 6) but not delete a category that already has jobs.
const DEFAULT_CATEGORIES = Object.freeze([
  'Tutoring',
  'Graphic Design',
  'Web Development',
  'Content Writing',
  'Data Entry',
  'Video Editing',
  'Event Staffing',
  'Delivery/Helper',
  'Social Media',
  'Other',
]);

const JOB_SORT_OPTIONS = Object.freeze({
  NEWEST: 'newest',
  BUDGET_HIGH: 'budget_high',
  BUDGET_LOW: 'budget_low',
  DEADLINE_SOON: 'deadline_soon',
});

const APPLICATION_STATUS = Object.freeze({
  PENDING: 'PENDING',
  SHORTLISTED: 'SHORTLISTED',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  WITHDRAWN: 'WITHDRAWN',
  COMPLETED: 'COMPLETED',
});

// Records *why* an application became WITHDRAWN: the student chose to withdraw, or the poster
// cancelled the job while this application was the accepted one. Both land on the same status
// (WITHDRAWN); this field preserves the real history. See DECISIONS.md B2.
const WITHDRAWN_BY = Object.freeze({
  STUDENT: 'STUDENT',
  POSTER_CANCELLED: 'POSTER_CANCELLED',
});

// --- Increment 5: reviews, messaging, reports ---

// An application may start a conversation (and keep sending messages) only while it is
// SHORTLISTED or ACCEPTED. In every other status the thread stays readable but read-only.
// See DECISIONS B7.
const MESSAGEABLE_APPLICATION_STATUSES = Object.freeze([
  APPLICATION_STATUS.SHORTLISTED,
  APPLICATION_STATUS.ACCEPTED,
]);

const REPORT_TARGET = Object.freeze({
  JOB: 'JOB',
  USER: 'USER',
});

const REPORT_REASON = Object.freeze({
  SPAM: 'SPAM',
  SCAM_OR_FRAUD: 'SCAM_OR_FRAUD',
  INAPPROPRIATE_CONTENT: 'INAPPROPRIATE_CONTENT',
  HARASSMENT: 'HARASSMENT',
  FAKE_PROFILE: 'FAKE_PROFILE',
  OTHER: 'OTHER',
});

const REPORT_STATUS = Object.freeze({
  PENDING: 'PENDING',
  REVIEWING: 'REVIEWING',
  RESOLVED: 'RESOLVED',
  DISMISSED: 'DISMISSED',
});

// A report is "active" until an admin resolves or dismisses it. Only one active report per
// reporter and target is allowed (partial unique index on Report).
const REPORT_ACTIVE_STATUSES = Object.freeze([REPORT_STATUS.PENDING, REPORT_STATUS.REVIEWING]);

const MESSAGE_MAX_LENGTH = 2000;
const REVIEW_COMMENT_MAX_LENGTH = 1000;

module.exports = {
  ROLES,
  APPLICATION_STATUS,
  WITHDRAWN_BY,
  REGISTRABLE_ROLES,
  USER_STATUS,
  AVAILABILITY,
  ORGANIZATION_TYPES,
  JOB_STATUS,
  JOB_FINAL_STATUSES,
  WORK_TYPE,
  DEFAULT_CATEGORIES,
  JOB_SORT_OPTIONS,
  MESSAGEABLE_APPLICATION_STATUSES,
  REPORT_TARGET,
  REPORT_REASON,
  REPORT_STATUS,
  REPORT_ACTIVE_STATUSES,
  MESSAGE_MAX_LENGTH,
  REVIEW_COMMENT_MAX_LENGTH,
};
