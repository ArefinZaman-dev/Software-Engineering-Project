import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Alert from '../../components/ui/Alert.jsx';
import Avatar from '../../components/ui/Avatar.jsx';
import Button, { buttonClasses } from '../../components/ui/Button.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import ErrorState from '../../components/ui/ErrorState.jsx';
import MessageButton from '../../components/MessageButton.jsx';
import PageLoader from '../../components/ui/PageLoader.jsx';
import Skeleton from '../../components/ui/Skeleton.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import useAsync from '../../hooks/useAsync.js';
import {
  acceptApplication,
  listApplicantsForJob,
  rejectApplication,
  shortlistApplication,
} from '../../services/applicationService.js';
import { completeJob, getJob } from '../../services/jobService.js';
import { APPLICATION_STATUS_BADGE_STYLES, APPLICATION_STATUS_LABELS } from '../../utils/constants.js';
import { getErrorMessage } from '../../utils/errors.js';

const DECIDABLE = ['PENDING', 'SHORTLISTED'];
const MESSAGEABLE = ['SHORTLISTED', 'ACCEPTED'];

export default function JobApplicantsPage() {
  const { id } = useParams();
  const { data: jobData, loading: jobLoading, error: jobError, reload: reloadJob } = useAsync(() => getJob(id), [id]);
  const { data, loading, error, reload } = useAsync(() => listApplicantsForJob(id), [id]);
  const [actionError, setActionError] = useState('');
  const [actionLoading, setActionLoading] = useState('');

  async function runAction(application, action, confirmMessage) {
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    setActionError('');
    setActionLoading(`${action}:${application.id}`);
    try {
      if (action === 'shortlist') await shortlistApplication(application.id);
      if (action === 'reject') await rejectApplication(application.id);
      if (action === 'accept') await acceptApplication(application.id);
      reload();
      reloadJob();
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setActionLoading('');
    }
  }

  async function handleComplete() {
    if (
      !window.confirm(
        'Mark this job as completed? You and the student will then be able to review each other. This cannot be undone.'
      )
    ) {
      return;
    }
    setActionError('');
    setActionLoading('complete:job');
    try {
      await completeJob(id);
      reload();
      reloadJob();
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setActionLoading('');
    }
  }

  if (jobLoading && !jobData) return <PageLoader label="Loading job..." />;
  if (jobError) return <ErrorState message={jobError.message} />;

  return (
    <div>
      <Link to={`/jobs/${id}`} className="text-sm text-brand-700 underline">
        ← Back to job details
      </Link>
      <h1 className="mt-3 font-display text-3xl font-bold">Applicants</h1>
      <p className="mt-1 text-muted">{jobData.job.title}</p>

      {jobData.job.status === 'IN_PROGRESS' && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-line bg-white p-4">
          <p className="text-sm">This job is in progress. Mark it completed once the work is done.</p>
          <Button loading={actionLoading === 'complete:job'} onClick={handleComplete}>
            Mark as completed
          </Button>
        </div>
      )}

      {actionError && <Alert className="mt-4">{actionError}</Alert>}

      <div className="mt-6">
        {loading && (
          <div className="space-y-3" aria-label="Loading applicants" role="status">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        )}

        {error && <ErrorState message={error.message} onRetry={reload} />}

        {data && data.applications.length === 0 && (
          <EmptyState title="No applicants yet." description="Check back once students start applying to this job." />
        )}

        {data && data.applications.length > 0 && (
          <ul className="space-y-3">
            {data.applications.map((application) => {
              const student = application.student;
              const busyPrefix = `${actionLoading.split(':')[1] === application.id ? actionLoading.split(':')[0] : ''}`;
              return (
                <li key={application.id} className="rounded-lg border border-line bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <Avatar name={student.name} />
                      <div>
                        <Link to={`/students/${student.id}`} className="font-display font-semibold hover:underline">
                          {student.name}
                        </Link>
                        {student.studentProfile?.university && (
                          <p className="text-sm text-muted">{student.studentProfile.university}</p>
                        )}
                      </div>
                    </div>
                    <StatusBadge
                      status={application.status}
                      labels={APPLICATION_STATUS_LABELS}
                      styles={APPLICATION_STATUS_BADGE_STYLES}
                    />
                  </div>

                  <p className="mt-3 whitespace-pre-line text-sm">{application.coverMessage}</p>
                  {application.proposedAmount && (
                    <p className="mt-1 text-sm text-muted">
                      Proposed amount: ৳{application.proposedAmount.toLocaleString('en-US')}
                    </p>
                  )}

                  {(MESSAGEABLE.includes(application.status) || application.status === 'COMPLETED') && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {MESSAGEABLE.includes(application.status) && (
                        <MessageButton applicationId={application.id} onError={setActionError}>
                          Message {student.name.split(' ')[0]}
                        </MessageButton>
                      )}
                      {application.status === 'COMPLETED' && (
                        <Link to={`/jobs/${id}/review`} className={buttonClasses()}>
                          Review {student.name.split(' ')[0]}
                        </Link>
                      )}
                    </div>
                  )}

                  {DECIDABLE.includes(application.status) && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {application.status === 'PENDING' && (
                        <Button
                          variant="secondary"
                          loading={busyPrefix === 'shortlist'}
                          onClick={() => runAction(application, 'shortlist')}
                        >
                          Shortlist
                        </Button>
                      )}
                      <Button
                        loading={busyPrefix === 'accept'}
                        onClick={() =>
                          runAction(
                            application,
                            'accept',
                            `Accept ${student.name} for this job? Every other applicant will be automatically rejected.`
                          )
                        }
                      >
                        Accept
                      </Button>
                      <Button
                        variant="danger"
                        loading={busyPrefix === 'reject'}
                        onClick={() => runAction(application, 'reject', `Reject ${student.name}'s application?`)}
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
