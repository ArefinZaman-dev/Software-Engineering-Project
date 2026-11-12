import { Link } from 'react-router-dom';
import EmptyState from '../../components/ui/EmptyState.jsx';
import ErrorState from '../../components/ui/ErrorState.jsx';
import { buttonClasses } from '../../components/ui/Button.jsx';
import Skeleton from '../../components/ui/Skeleton.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import useAsync from '../../hooks/useAsync.js';
import { listMyJobs } from '../../services/jobService.js';

function formatBudget(amount) {
  return `৳${amount.toLocaleString('en-US')}`;
}

export default function MyJobsPage() {
  const { data, loading, error, reload } = useAsync(listMyJobs, []);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">My jobs</h1>
          <p className="mt-1 text-muted">Everything you have posted, in every status.</p>
        </div>
        <Link to="/poster/jobs/new" className={buttonClasses()}>
          Post a job
        </Link>
      </div>

      <div className="mt-6">
        {loading && (
          <div className="space-y-3" aria-label="Loading your jobs" role="status">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        )}

        {error && <ErrorState message={error.message} onRetry={reload} />}

        {data && data.jobs.length === 0 && (
          <EmptyState
            title="You haven't posted any jobs yet."
            description="Post your first job and students will be able to find and apply to it."
            action={
              <Link to="/poster/jobs/new" className={buttonClasses()}>
                Post a job
              </Link>
            }
          />
        )}

        {data && data.jobs.length > 0 && (
          <ul className="space-y-3">
            {data.jobs.map((job) => (
              <li key={job.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-white p-4">
                <div>
                  {job.removedByAdmin ? (
                    // A removed job has no public page, so there is nothing to link to.
                    <p className="font-display font-semibold">{job.title}</p>
                  ) : (
                    <Link to={`/jobs/${job.id}`} className="font-display font-semibold hover:underline">
                      {job.title}
                    </Link>
                  )}
                  <p className="text-sm text-muted">
                    {job.category?.name} · {formatBudget(job.budget)}
                  </p>
                  {job.removedByAdmin && (
                    <p className="mt-1 text-sm text-danger">
                      An admin removed this job from the platform. It is hidden from everyone else and can no longer be edited.
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Link to={`/poster/jobs/${job.id}/applicants`} className="text-sm font-medium text-brand-700 underline">
                    Applicants
                  </Link>
                  {job.removedByAdmin ? (
                    <span className="inline-flex rounded-full bg-danger-soft px-2.5 py-1 text-xs font-medium text-danger">Removed</span>
                  ) : (
                    <StatusBadge status={job.status} />
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
