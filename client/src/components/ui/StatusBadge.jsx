import { JOB_STATUS_BADGE_STYLES, JOB_STATUS_LABELS } from '../../utils/constants.js';

// Reused for both job statuses (the default) and application statuses (pass the application
// label/style maps as props) so both look consistent without duplicating this component.
export default function StatusBadge({ status, labels = JOB_STATUS_LABELS, styles = JOB_STATUS_BADGE_STYLES }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
        styles[status] || 'bg-line text-muted'
      }`}
    >
      {labels[status] || status}
    </span>
  );
}
