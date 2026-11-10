import { useEffect, useState } from 'react';
import Alert from './ui/Alert.jsx';
import Button from './ui/Button.jsx';
import FormField from './ui/FormField.jsx';
import SkillsInput from './ui/SkillsInput.jsx';
import useAsync from '../hooks/useAsync.js';
import { listCategories } from '../services/categoryService.js';
import { WORK_TYPE_OPTIONS } from '../utils/constants.js';

const EMPTY_VALUES = {
  title: '',
  description: '',
  category: '',
  skills: [],
  budget: '',
  duration: '',
  location: '',
  workType: 'REMOTE',
  deadline: '',
};

// Builds a YYYY-MM-DD string from LOCAL date parts (not toISOString, which uses UTC and can
// shift the displayed date by one day for timezones ahead of UTC, like Bangladesh/UTC+6).
function toDateInputValue(deadline) {
  if (!deadline) return '';
  const date = new Date(deadline);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// A date picked in a date-only input is treated as the END of that day in the browser's own
// (local) timezone, not UTC midnight. Otherwise, picking "today" as the deadline could already
// read as several hours in the past once converted to UTC, for timezones ahead of UTC.
function toDeadlineISOString(dateOnlyValue) {
  return new Date(`${dateOnlyValue}T23:59:59`).toISOString();
}

function todayDateInputValue() {
  return toDateInputValue(new Date());
}

function validate(values) {
  const errors = {};
  if (values.title.trim().length < 5) errors.title = 'Title must be at least 5 characters.';
  if (values.title.trim().length > 120) errors.title = 'Title must be at most 120 characters.';
  if (values.description.trim().length < 20) errors.description = 'Description must be at least 20 characters.';
  if (values.description.trim().length > 5000) errors.description = 'Description must be at most 5000 characters.';
  if (!values.category) errors.category = 'Choose a category.';
  const budgetNumber = Number(values.budget);
  if (!values.budget || Number.isNaN(budgetNumber) || budgetNumber <= 0) errors.budget = 'Enter a budget greater than 0.';
  if (!values.duration.trim()) errors.duration = 'Duration is required.';
  if (!values.location.trim()) errors.location = 'Location is required.';
  if (!values.deadline) errors.deadline = 'Deadline is required.';
  else if (new Date(`${values.deadline}T23:59:59`).getTime() <= Date.now()) errors.deadline = 'Deadline must be in the future.';
  return errors;
}

// Shared by the create and edit pages. `initialValues` (from an existing job) switches it to
// edit mode; `submitLabel` and `onSubmit` are supplied by the page.
export default function JobForm({ initialValues, submitLabel, onSubmit, formError }) {
  const { data: categoriesData, loading: loadingCategories, error: categoriesError } = useAsync(listCategories, []);
  const [values, setValues] = useState(() => ({
    ...EMPTY_VALUES,
    ...initialValues,
    deadline: toDateInputValue(initialValues?.deadline),
  }));
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // The category list arrives after the first render, so pick a default once it loads
  // (only relevant when creating a new job; editing already has a category).
  useEffect(() => {
    if (!initialValues && categoriesData && !values.category && categoriesData.categories.length > 0) {
      setValues((previous) => ({ ...previous, category: categoriesData.categories[0].id }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoriesData]);

  const setField = (field) => (event) => setValues((previous) => ({ ...previous, [field]: event.target.value }));

  async function handleSubmit(event) {
    event.preventDefault();
    const validation = validate(values);
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;

    setSubmitting(true);
    try {
      await onSubmit({
        title: values.title.trim(),
        description: values.description.trim(),
        category: values.category,
        skills: values.skills,
        budget: Number(values.budget),
        duration: values.duration.trim(),
        location: values.location.trim(),
        workType: values.workType,
        deadline: toDeadlineISOString(values.deadline),
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingCategories) return <p className="text-muted">Loading the form...</p>;
  if (categoriesError) return <Alert>{categoriesError.message}</Alert>;

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4 rounded-lg border border-line bg-white p-6">
      {formError && <Alert>{formError}</Alert>}

      <FormField label="Job title" value={values.title} onChange={setField('title')} error={errors.title} placeholder="For example: Weekend math tutor for a Class 9 student" />
      <FormField
        as="textarea"
        rows={6}
        label="Description"
        value={values.description}
        onChange={setField('description')}
        error={errors.description}
        hint="What does the work involve? What should an applicant know before applying?"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField as="select" label="Category" value={values.category} onChange={setField('category')} error={errors.category}>
          {categoriesData.categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </FormField>
        <FormField as="select" label="Work type" value={values.workType} onChange={setField('workType')} error={errors.workType}>
          {WORK_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </FormField>
      </div>

      <SkillsInput label="Required skills (optional)" value={values.skills} onChange={(skills) => setValues((previous) => ({ ...previous, skills }))} max={15} />

      <div className="grid gap-4 sm:grid-cols-3">
        <FormField label="Budget (৳)" type="number" min="1" value={values.budget} onChange={setField('budget')} error={errors.budget} />
        <FormField label="Duration" value={values.duration} onChange={setField('duration')} error={errors.duration} placeholder="For example: 3 days" />
        <FormField
          label="Deadline"
          type="date"
          min={todayDateInputValue()}
          value={values.deadline}
          onChange={setField('deadline')}
          error={errors.deadline}
        />
      </div>

      <FormField label="Location" value={values.location} onChange={setField('location')} error={errors.location} placeholder="For example: Mirpur, Dhaka or Remote" />

      <Button type="submit" loading={submitting}>
        {submitting ? 'Saving...' : submitLabel}
      </Button>
    </form>
  );
}
