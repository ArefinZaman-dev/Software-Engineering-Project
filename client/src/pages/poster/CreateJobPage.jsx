import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import JobForm from '../../components/JobForm.jsx';
import { createJob } from '../../services/jobService.js';
import { getErrorMessage } from '../../utils/errors.js';

export default function CreateJobPage() {
  const navigate = useNavigate();
  const [formError, setFormError] = useState('');

  async function handleSubmit(values) {
    try {
      const data = await createJob(values);
      navigate(`/jobs/${data.job.id}`, { replace: true });
    } catch (error) {
      setFormError(getErrorMessage(error));
      throw error;
    }
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-bold">Post a job</h1>
      <p className="mt-1 text-muted">Your job goes live for students to see as soon as you publish it.</p>
      <div className="mt-6 max-w-2xl">
        <JobForm submitLabel="Publish job" onSubmit={handleSubmit} formError={formError} />
      </div>
    </div>
  );
}
