import { useState } from 'react';
import { createReport } from '../services/reportService.js';
import { REPORT_REASON_OPTIONS } from '../utils/constants.js';
import { getErrorMessage, getFieldErrors } from '../utils/errors.js';
import Alert from './ui/Alert.jsx';
import Button from './ui/Button.jsx';
import FormField from './ui/FormField.jsx';

// A small "Report" control that expands into a form. `targetType` is 'JOB' or 'USER'.
export default function ReportForm({ targetType, targetId, triggerLabel }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  function validate() {
    const found = {};
    if (!reason) found.reason = 'Choose a reason for the report.';
    if (reason === 'OTHER' && description.trim().length < 10) {
      found.description = 'Please describe the problem (at least 10 characters).';
    }
    if (description.length > 1000) found.description = 'Description must be at most 1000 characters.';
    return found;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    setFormError('');
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    try {
      await createReport({ targetType, targetId, reason, description: description.trim() });
      setSent(true);
      setOpen(false);
    } catch (err) {
      setErrors(getFieldErrors(err));
      setFormError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return <Alert variant="success">Thank you. Your report has been sent to the admins.</Alert>;
  }

  if (!open) {
    return (
      <Button variant="ghost" onClick={() => setOpen(true)}>
        {triggerLabel}
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4 rounded-lg border border-line bg-white p-4">
      <h2 className="font-display text-lg font-semibold">{triggerLabel}</h2>
      {formError && <Alert>{formError}</Alert>}

      <FormField
        as="select"
        label="Reason"
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        error={errors.reason}
      >
        <option value="">Choose a reason...</option>
        {REPORT_REASON_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </FormField>

      <FormField
        as="textarea"
        rows={4}
        label="Details (optional)"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        error={errors.description}
        maxLength={1000}
        hint="Tell the admins what happened. Please do not include passwords or other private information."
      />

      <div className="flex flex-wrap gap-2">
        <Button type="submit" loading={submitting}>
          Send report
        </Button>
        <Button variant="secondary" onClick={() => setOpen(false)} disabled={submitting}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
