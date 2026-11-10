import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Alert from '../components/ui/Alert.jsx';
import Button, { buttonClasses } from '../components/ui/Button.jsx';
import ErrorState from '../components/ui/ErrorState.jsx';
import ReportForm from '../components/ReportForm.jsx';
import PageLoader from '../components/ui/PageLoader.jsx';
import StatusBadge from '../components/ui/StatusBadge.jsx';
import useAsync from '../hooks/useAsync.js';
import useAuth from '../hooks/useAuth.js';
import { cancelJob, closeJob, completeJob, deleteJob, getJob } from '../services/jobService.js';
import { ROLES, WORK_TYPE_OPTIONS, labelFor } from '../utils/constants.js';
import { getErrorMessage } from '../utils/errors.js';

function formatBudget(amount) {
  return `৳${amount.toLocaleString('en-US')}`;
}

function formatDate(value) {
  return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function JobDetailsPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, loading, error, reload } = useAsync(() => getJob(id), [id]);
  const [actionError, setActionError] = useState('');
  const [actionLoading, setActionLoading] = useState('');

  if (loading) return <PageLoader label="Loading job..." />;
  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <ErrorState
          message={error.status === 404 ? 'This job does not exist or is no longer available.' : error.message}
          onRetry={error.status === 404 ? undefined : reload}
        />
      </div>
    );
  }

  const { job } = data;
  const isOwner = user?.role === ROLES.POSTER && user.id === job.poster.id;
  const isPastDeadline = new Date(job.deadline).getTime() < Date.now();
  const canApply = job.status === 'OPEN' && !isPastDeadline;
  // Students and other posters may report a job; its own poster may not.
  const canReport = !isOwner && (user?.role === ROLES.STUDENT || user?.role === ROLES.POSTER);

  async function runAction(action, confirmMessage) {
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    setActionError('');
    setActionLoading(action);
    try {
      if (action === 'close') await closeJob(job.id);
      if (action === 'cancel') await cancelJob(job.id);
      if (action === 'complete') await completeJob(job.id);
      if (action === 'delete') {
        await deleteJob(job.id);
        navigate('/poster/jobs', { replace: true });
        return;
      }
      reload();
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setActionLoading('');
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link to="/jobs" className="text-sm text-brand-700 underline">
        ← Back to browse jobs
      </Link>

      <article className="mt-4 rounded-lg border border-line bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="font-display text-2xl font-bold sm:text-3xl">{job.title}</h1>
          <StatusBadge status={job.status} />
        </div>

        <p className="mt-2 text-muted">
          {job.category.name} · {labelFor(WORK_TYPE_OPTIONS, job.workType)} · {job.location}
        </p>

        <div className="mt-4 flex flex-wrap gap-6 rounded-md bg-paper p-4 text-sm">
          <div>
            <p className="text-muted">Budget</p>
            <p className="font-display text-xl font-bold text-brand-700">{formatBudget(job.budget)}</p>
          </div>
          <div>
            <p className="text-muted">Duration</p>
            <p className="font-medium">{job.duration}</p>
          </div>
          <div>
            <p className="text-muted">Deadline</p>
            <p className={`font-medium ${isPastDeadline ? 'text-danger' : ''}`}>
              {formatDate(job.deadline)} {isPastDeadline && '(passed)'}
            </p>
          </div>
        </div>

        <section className="mt-6" aria-labelledby="description-heading">
          <h2 id="description-heading" className="font-display text-lg font-semibold">
            Description
          </h2>
          <p className="mt-2 whitespace-pre-line text-ink">{job.description}</p>
        </section>

        {job.skills?.length > 0 && (
          <section className="mt-6" aria-labelledby="skills-heading">
            <h2 id="skills-heading" className="font-display text-lg font-semibold">
              Required skills
            </h2>
            <ul className="mt-2 flex flex-wrap gap-2" aria-label="Required skills">
              {job.skills.map((skill) => (
                <li key={skill} className="rounded-full bg-brand-50 px-3 py-1 text-sm text-brand-700">
                  {skill}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-6 border-t border-line pt-4" aria-labelledby="poster-heading">
          <h2 id="poster-heading" className="sr-only">
            About the poster
          </h2>
          <p className="text-sm text-muted">
            Posted by{' '}
            <Link to={`/posters/${job.poster.id}`} className="font-medium text-brand-700 underline">
              {job.poster.name}
            </Link>
          </p>
        </section>

        {!isOwner && (
          <div className="mt-6">
            {user?.role === ROLES.STUDENT ? (
              canApply ? (
                <Link to={`/jobs/${job.id}/apply`} className={buttonClasses()}>
                  Apply for this job
                </Link>
              ) : (
                <p className="text-sm text-muted">This job is no longer accepting applications.</p>
              )
            ) : !user ? (
              <p className="text-sm text-muted">
                <Link to="/login" className="font-medium text-brand-700 underline">
                  Log in
                </Link>{' '}
                as a student to apply for this job.
              </p>
            ) : null}
          </div>
        )}

        {canReport && (
          <div className="mt-6 border-t border-line pt-4">
            <ReportForm targetType="JOB" targetId={job.id} triggerLabel="Report this job" />
          </div>
        )}

        {isOwner && (
          <div className="mt-6 border-t border-line pt-4">
            <h2 className="font-display text-lg font-semibold">Manage this job</h2>
            {actionError && (
              <Alert className="mt-3">{actionError}</Alert>
            )}
            <div className="mt-3 flex flex-wrap gap-3">
              <Link to={`/poster/jobs/${job.id}/applicants`} className={buttonClasses({ variant: 'secondary' })}>
                View applicants
              </Link>
              {job.status === 'OPEN' && (
                <>
                  <Link to={`/poster/jobs/${job.id}/edit`} className="inline-flex">
                    <Button variant="secondary">Edit</Button>
                  </Link>
                  <Button
                    variant="secondary"
                    loading={actionLoading === 'close'}
                    onClick={() => runAction('close', 'Close this job? Students will no longer be able to apply.')}
                  >
                    Close job
                  </Button>
                  <Button
                    variant="danger"
                    loading={actionLoading === 'delete'}
                    onClick={() => runAction('delete', 'Delete this job permanently? This cannot be undone.')}
                  >
                    Delete
                  </Button>
                </>
              )}
              {job.status === 'IN_PROGRESS' && (
                <Button
                  loading={actionLoading === 'complete'}
                  onClick={() =>
                    runAction(
                      'complete',
                      'Mark this job as completed? You and the student will then be able to review each other. This cannot be undone.'
                    )
                  }
                >
                  Mark as completed
                </Button>
              )}
              {job.status === 'COMPLETED' && (
                <Link to={`/jobs/${job.id}/review`} className={buttonClasses()}>
                  Review the student
                </Link>
              )}
              {['OPEN', 'IN_PROGRESS'].includes(job.status) && (
                <Button
                  variant="danger"
                  loading={actionLoading === 'cancel'}
                  onClick={() => runAction('cancel', 'Cancel this job?')}
                >
                  Cancel job
                </Button>
              )}
            </div>
          </div>
        )}
      </article>
    </div>
  );
}
