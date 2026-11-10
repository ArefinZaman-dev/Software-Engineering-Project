import { Link } from 'react-router-dom';
import StatusBadge from './ui/StatusBadge.jsx';
import { WORK_TYPE_OPTIONS, labelFor } from '../utils/constants.js';

function formatBudget(amount) {
  return `৳${amount.toLocaleString('en-US')}`;
}

function formatDeadline(deadline) {
  const days = Math.ceil((new Date(deadline) - Date.now()) / (1000 * 60 * 60 * 24));
  if (days < 0) return 'Deadline passed';
  if (days === 0) return 'Deadline today';
  if (days === 1) return '1 day left';
  return `${days} days left`;
}

export default function JobCard({ job, showStatus = false }) {
  return (
    <article className="rounded-lg border border-line bg-white p-5 transition-shadow hover:shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-lg font-semibold">
          <Link to={`/jobs/${job.id}`} className="hover:underline">
            {job.title}
          </Link>
        </h3>
        {showStatus && <StatusBadge status={job.status} />}
      </div>

      <p className="mt-1 text-sm text-muted">
        {job.category?.name} · {labelFor(WORK_TYPE_OPTIONS, job.workType)} · {job.location}
      </p>

      <p className="mt-3 line-clamp-2 text-sm text-ink">{job.description}</p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="font-display text-lg font-bold text-brand-700">{formatBudget(job.budget)}</span>
        <span className="text-muted">{formatDeadline(job.deadline)}</span>
      </div>

      {job.poster?.name && <p className="mt-2 text-xs text-muted">Posted by {job.poster.name}</p>}
    </article>
  );
}
