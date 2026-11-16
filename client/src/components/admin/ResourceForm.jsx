import { useState } from 'react';
import Alert from '../ui/Alert.jsx';
import Button from '../ui/Button.jsx';
import FormField from '../ui/FormField.jsx';
import { RESOURCE_TYPE_OPTIONS } from '../../utils/constants.js';
import { getErrorMessage, getFieldErrors } from '../../utils/errors.js';

const EMPTY = { title: '', type: 'VIDEO', url: '', skill: '', description: '' };

function isWebLink(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

// Mirrors the server rules so a mistake is shown at once; the server checks again.
function validate(values) {
  const errors = {};
  const title = values.title.trim();
  const url = values.url.trim();
  if (title.length < 3) errors.title = 'Title must be at least 3 characters.';
  if (title.length > 120) errors.title = 'Title must be at most 120 characters.';

  if (values.type === 'NOTE') {
    if (!values.description.trim()) errors.description = 'A note needs some text in the description.';
  } else if (!url) {
    errors.url = 'This type of resource needs a link.';
  }
  if (url && !isWebLink(url)) errors.url = 'Enter a valid link that starts with http:// or https://';
  return errors;
}

// Used both to add a resource and to edit one. `onSubmit(values)` does the request and may throw.
export default function ResourceForm({ initial = EMPTY, submitLabel, onSubmit, onCancel }) {
  const [values, setValues] = useState({ ...EMPTY, ...initial });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const setField = (field) => (event) => setValues((previous) => ({ ...previous, [field]: event.target.value }));
  const isNote = values.type === 'NOTE';

  async function handleSubmit(event) {
    event.preventDefault();
    const validation = validate(values);
    setErrors(validation);
    setFormError('');
    if (Object.keys(validation).length > 0) return;

    setSubmitting(true);
    try {
      await onSubmit({
        title: values.title.trim(),
        type: values.type,
        url: values.url.trim(),
        skill: values.skill.trim(),
        description: values.description.trim(),
      });
      if (!initial.title) setValues(EMPTY); // an "add" form clears itself; an "edit" form is closed by its parent
    } catch (err) {
      setErrors(getFieldErrors(err));
      setFormError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4 rounded-lg border border-line bg-white p-5">
      {formError && <Alert>{formError}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Title" value={values.title} onChange={setField('title')} error={errors.title} maxLength={120} placeholder="e.g. React crash course" />
        <FormField as="select" label="Type" value={values.type} onChange={setField('type')} error={errors.type}>
          {RESOURCE_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </FormField>
      </div>

      <FormField
        label={isNote ? 'Link (optional)' : 'Link'}
        type="url"
        value={values.url}
        onChange={setField('url')}
        error={errors.url}
        maxLength={500}
        placeholder="https://www.youtube.com/watch?v=..."
        hint="Paste the full link, starting with https://"
      />

      <FormField
        label="Skill this teaches (optional)"
        value={values.skill}
        onChange={setField('skill')}
        error={errors.skill}
        maxLength={40}
        placeholder="e.g. React basics"
      />

      <FormField
        as="textarea"
        rows={3}
        label={isNote ? 'Information for the student' : 'What will the student learn? (optional)'}
        value={values.description}
        onChange={setField('description')}
        error={errors.description}
        maxLength={1000}
        hint={isNote ? 'Required for this type. Plain text only.' : 'One or two lines, e.g. which part to watch first.'}
      />

      <div className="flex flex-wrap gap-3">
        <Button type="submit" loading={submitting}>
          {submitLabel}
        </Button>
        {onCancel && (
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
