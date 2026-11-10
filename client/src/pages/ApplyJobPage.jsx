import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Alert from '../components/ui/Alert.jsx';
import Button from '../components/ui/Button.jsx';
import ErrorState from '../components/ui/ErrorState.jsx';
import FormField from '../components/ui/FormField.jsx';
import PageLoader from '../components/ui/PageLoader.jsx';
import useAsync from '../hooks/useAsync.js';
import { applyToJob } from '../services/applicationService.js';
import { getJob } from '../services/jobService.js';
import { getErrorMessage } from '../utils/errors.js';

function validate(values) {
  const errors = {};
  const message = values.coverMessage.trim();
  if (message.length < 10) errors.coverMessage = 'Write at least a couple of sentences (10+ characters).';
  if (message.length > 1000) errors.coverMessage = 'Cover message must be at most 1000 characters.';
  if (values.proposedAmount) {
    const amount = Number(values.proposedAmount);
    if (Number.isNaN(amount) || amount <= 0) errors.proposedAmount = 'Enter a proposed amount greater than 0.';
  }
  return errors;
}

export default function ApplyJobPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, loading, error } = useAsync(() => getJob(id), [id]);
  const [values, setValues] = useState({ coverMessage: '', proposedAmount: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <PageLoader label="Loading job..." />;
  if (error) return <ErrorState message={error.message} />;

  const { job } = data;
  const setField = (field) => (event) => setValues((previous) => ({ ...previous, [field]: event.target.value }));

  async function handleSubmit(event) {
    event.preventDefault();
    const validation = validate(values);
    setErrors(validation);
    setFormError('');
    if (Object.keys(validation).length > 0) return;

    setSubmitting(true);
    try {
      await applyToJob(id, {
        coverMessage: values.coverMessage.trim(),
        ...(values.proposedAmount ? { proposedAmount: Number(values.proposedAmount) } : {}),
      });
      navigate('/student/applications', { replace: true });
    } catch (err) {
      setFormError(getErrorMessage(err));
      setSubmitting(false);
    }
  }

  if (job.status !== 'OPEN') {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <Alert>
          This job is no longer open for applications.{' '}
          <Link to={`/jobs/${job.id}`} className="underline">
            View the job
          </Link>
          .
        </Alert>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link to={`/jobs/${job.id}`} className="text-sm text-brand-700 underline">
        ← Back to job details
      </Link>

      <h1 className="mt-4 font-display text-3xl font-bold">Apply: {job.title}</h1>
      <p className="mt-1 text-muted">
        Posted by {job.poster.name} · Budget ৳{job.budget.toLocaleString('en-US')}
      </p>

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4 rounded-lg border border-line bg-white p-6">
        {formError && <Alert>{formError}</Alert>}

        <FormField
          as="textarea"
          rows={6}
          label="Cover message"
          value={values.coverMessage}
          onChange={setField('coverMessage')}
          error={errors.coverMessage}
          hint="Introduce yourself and say why you're a good fit for this job."
        />
        <FormField
          label="Your proposed amount (optional, ৳)"
          type="number"
          min="1"
          value={values.proposedAmount}
          onChange={setField('proposedAmount')}
          error={errors.proposedAmount}
          hint={`The poster's budget is ৳${job.budget.toLocaleString('en-US')}. Leave blank to apply at that budget.`}
        />

        <Button type="submit" loading={submitting}>
          {submitting ? 'Submitting...' : 'Submit application'}
        </Button>
      </form>
    </div>
  );
}
