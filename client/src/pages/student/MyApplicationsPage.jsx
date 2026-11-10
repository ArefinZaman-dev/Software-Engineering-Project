import { useState } from 'react';
import { Link } from 'react-router-dom';
import Alert from '../../components/ui/Alert.jsx';
import Button, { buttonClasses } from '../../components/ui/Button.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import ErrorState from '../../components/ui/ErrorState.jsx';
import MessageButton from '../../components/MessageButton.jsx';
import Skeleton from '../../components/ui/Skeleton.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import useAsync from '../../hooks/useAsync.js';
import { listMyApplications, withdrawApplication } from '../../services/applicationService.js';
import { APPLICATION_STATUS_BADGE_STYLES, APPLICATION_STATUS_LABELS } from '../../utils/constants.js';
import { getErrorMessage } from '../../utils/errors.js';

const WITHDRAWABLE = ['PENDING', 'SHORTLISTED', 'ACCEPTED'];
// Messaging is open only while the poster is actively considering or working with the student.
const MESSAGEABLE = ['SHORTLISTED', 'ACCEPTED'];

export default function MyApplicationsPage() {
  const { data, loading, error, reload } = useAsync(listMyApplications, []);
  const [actionError, setActionError] = useState('');
  const [withdrawingId, setWithdrawingId] = useState('');

  async function handleWithdraw(application) {
    const confirmed = window.confirm(
      application.status === 'ACCEPTED'
        ? 'Withdraw from this job? The poster will be notified and the job will reopen for other applicants.'
        : 'Withdraw this application? You will not be able to apply to this job again.'
    );
    if (!confirmed) return;

    setActionError('');
    setWithdrawingId(application.id);
    try {
      await withdrawApplication(application.id);
      reload();
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setWithdrawingId('');
    }
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-bold">My applications</h1>
      <p className="mt-1 text-muted">Every job you&apos;ve applied to, and where things stand.</p>

      {actionError && <Alert className="mt-4">{actionError}</Alert>}

      <div className="mt-6">
        {loading && (
          <div className="space-y-3" aria-label="Loading your applications" role="status">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        )}

        {error && <ErrorState message={error.message} onRetry={reload} />}

        {data && data.applications.length === 0 && (
          <EmptyState
            title="You haven't applied to any jobs yet."
            description="Browse open jobs and apply to the ones that fit your skills."
            action={
              <Link to="/jobs" className={buttonClasses()}>
                Browse jobs
              </Link>
            }
          />
        )}

        {data && data.applications.length > 0 && (
          <ul className="space-y-3">
            {data.applications.map((application) => (
              <li key={application.id} className="rounded-lg border border-line bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link to={`/jobs/${application.job.id}`} className="font-display font-semibold hover:underline">
                      {application.job.title}
                    </Link>
                    <p className="text-sm text-muted">Posted by {application.job.poster?.name}</p>
                  </div>
                  <StatusBadge
                    status={application.status}
                    labels={APPLICATION_STATUS_LABELS}
                    styles={APPLICATION_STATUS_BADGE_STYLES}
                  />
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {MESSAGEABLE.includes(application.status) && (
                    <MessageButton applicationId={application.id} onError={setActionError}>
                      Message poster
                    </MessageButton>
                  )}
                  {application.status === 'ACCEPTED' && application.job.status === 'IN_PROGRESS' && (
                    <p className="self-center text-sm text-muted">The poster will mark the job completed when the work is done.</p>
                  )}
                  {application.status === 'COMPLETED' && (
                    <Link to={`/jobs/${application.job.id}/review`} className={buttonClasses()}>
                      Review the poster
                    </Link>
                  )}
                  {WITHDRAWABLE.includes(application.status) && (
                    <Button
                      variant="secondary"
                      loading={withdrawingId === application.id}
                      onClick={() => handleWithdraw(application)}
                    >
                      Withdraw
                    </Button>
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
