export const ROLES = { STUDENT: 'STUDENT', POSTER: 'POSTER', ADMIN: 'ADMIN' };

export const AVAILABILITY_OPTIONS = [
  { value: 'FLEXIBLE', label: 'Flexible' },
  { value: 'WEEKDAYS', label: 'Weekdays' },
  { value: 'WEEKENDS', label: 'Weekends' },
  { value: 'EVENINGS', label: 'Evenings' },
  { value: 'NOT_AVAILABLE', label: 'Not available right now' },
];

export const ORGANIZATION_TYPE_OPTIONS = [
  { value: 'INDIVIDUAL', label: 'Individual' },
  { value: 'BUSINESS', label: 'Business' },
  { value: 'ORGANIZATION', label: 'Organization' },
];

export const WORK_TYPE_OPTIONS = [
  { value: 'REMOTE', label: 'Remote' },
  { value: 'ON_SITE', label: 'On-site' },
  { value: 'HYBRID', label: 'Hybrid' },
];

export const JOB_STATUS_LABELS = {
  OPEN: 'Open',
  CLOSED: 'Closed',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export const JOB_STATUS_BADGE_STYLES = {
  OPEN: 'bg-brand-50 text-brand-700',
  CLOSED: 'bg-line text-muted',
  IN_PROGRESS: 'bg-mark-soft text-ink',
  COMPLETED: 'bg-brand-100 text-brand-700',
  CANCELLED: 'bg-danger-soft text-danger',
};

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'budget_high', label: 'Budget: high to low' },
  { value: 'budget_low', label: 'Budget: low to high' },
  { value: 'deadline_soon', label: 'Deadline: soonest first' },
];

export const APPLICATION_STATUS_LABELS = {
  PENDING: 'Pending',
  SHORTLISTED: 'Shortlisted',
  ACCEPTED: 'Accepted',
  REJECTED: 'Rejected',
  WITHDRAWN: 'Withdrawn',
  COMPLETED: 'Completed',
};

export const APPLICATION_STATUS_BADGE_STYLES = {
  PENDING: 'bg-mark-soft text-ink',
  SHORTLISTED: 'bg-brand-50 text-brand-700',
  ACCEPTED: 'bg-brand-100 text-brand-700',
  REJECTED: 'bg-danger-soft text-danger',
  WITHDRAWN: 'bg-line text-muted',
  COMPLETED: 'bg-brand-100 text-brand-700',
};

export const labelFor = (options, value) => options.find((option) => option.value === value)?.label || '';

export const REPORT_REASON_OPTIONS = [
  { value: 'SPAM', label: 'Spam or advertising' },
  { value: 'SCAM_OR_FRAUD', label: 'Scam or fraud' },
  { value: 'INAPPROPRIATE_CONTENT', label: 'Inappropriate content' },
  { value: 'HARASSMENT', label: 'Harassment or abuse' },
  { value: 'FAKE_PROFILE', label: 'Fake profile' },
  { value: 'OTHER', label: 'Something else' },
];

export const RATING_LABELS = { 1: 'Poor', 2: 'Fair', 3: 'Good', 4: 'Very good', 5: 'Excellent' };

export const MESSAGE_MAX_LENGTH = 2000;
export const REVIEW_COMMENT_MAX_LENGTH = 1000;

// Shared by the review and message screens.
export function formatDateTime(value) {
  return new Date(value).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDay(value) {
  return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ---- Admin panel (Increment 6) ----
export const ROLE_LABELS = { STUDENT: 'Student', POSTER: 'Poster', ADMIN: 'Admin' };

export const REPORT_STATUS_LABELS = {
  PENDING: 'Pending',
  REVIEWING: 'Under review',
  RESOLVED: 'Resolved',
  DISMISSED: 'Dismissed',
};

export const REPORT_STATUS_BADGE_STYLES = {
  PENDING: 'bg-mark-soft text-ink',
  REVIEWING: 'bg-brand-50 text-brand-700',
  RESOLVED: 'bg-brand-50 text-brand-700',
  DISMISSED: 'bg-line text-muted',
};

export const USER_STATUS_LABELS = { ACTIVE: 'Active', SUSPENDED: 'Suspended' };
export const USER_STATUS_BADGE_STYLES = {
  ACTIVE: 'bg-brand-50 text-brand-700',
  SUSPENDED: 'bg-danger-soft text-danger',
};
