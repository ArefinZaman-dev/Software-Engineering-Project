import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Alert from '../../components/ui/Alert.jsx';
import ErrorState from '../../components/ui/ErrorState.jsx';
import PageLoader from '../../components/ui/PageLoader.jsx';
import JobForm from '../../components/JobForm.jsx';
import useAsync from '../../hooks/useAsync.js';
import { getJob, updateJob } from '../../services/jobService.js';
import { getErrorMessage } from '../../utils/errors.js';

export default function EditJobPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, loading, error } = useAsync(() => getJob(id), [id]);
  const [formError, setFormError] = useState('');

  if (loading) return <PageLoader label="Loading job..." />;
  if (error) return <ErrorState message={error.message} />;

  const { job } = data;

  if (job.status !== 'OPEN') {
    return (
      <Alert>
        This job is {job.status.toLowerCase().replace('_', ' ')} and can no longer be edited.{' '}
        <Link to={`/jobs/${job.id}`} className="underline">
          View the job
        </Link>
        .
      </Alert>
    );
  }

  async function handleSubmit(values) {
    try {
      await updateJob(id, values);
      navigate(`/jobs/${id}`, { replace: true });
    } catch (error) {
      setFormError(getErrorMessage(error));
      throw error;
    }
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-bold">Edit job</h1>
      <p className="mt-1 text-muted">You can only edit a job while it is open.</p>
      <div className="mt-6 max-w-2xl">
        <JobForm
          initialValues={{ ...job, category: job.category.id }}
          submitLabel="Save changes"
          onSubmit={handleSubmit}
          formError={formError}
        />
      </div>
    </div>
  );
}
