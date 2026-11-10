import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Alert from '../components/ui/Alert.jsx';
import Button from '../components/ui/Button.jsx';
import FormField from '../components/ui/FormField.jsx';
import useAuth from '../hooks/useAuth.js';
import { roleHome } from '../routes/paths.js';
import { ORGANIZATION_TYPE_OPTIONS, ROLES } from '../utils/constants.js';
import { getErrorMessage, getFieldErrors } from '../utils/errors.js';
import { validateRegister } from '../utils/validators.js';

const ROLE_CHOICES = [
  { value: ROLES.STUDENT, title: 'I am a student', text: 'Find flexible work and build a reputation.' },
  { value: ROLES.POSTER, title: 'I want to hire', text: 'Post jobs and choose a student.' },
];

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [role, setRole] = useState(searchParams.get('role') === 'poster' ? ROLES.POSTER : ROLES.STUDENT);
  const [values, setValues] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    university: '',
    organizationType: 'INDIVIDUAL',
    organizationName: '',
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const setField = (field) => (event) => setValues((previous) => ({ ...previous, [field]: event.target.value }));
  const isPoster = role === ROLES.POSTER;
  const needsOrganizationName = isPoster && values.organizationType !== 'INDIVIDUAL';

  async function handleSubmit(event) {
    event.preventDefault();
    const validation = validateRegister(values);
    setErrors(validation);
    setFormError('');
    if (Object.keys(validation).length > 0) return;

    const payload = { role, name: values.name.trim(), email: values.email.trim(), password: values.password };
    if (!isPoster && values.university.trim()) payload.university = values.university.trim();
    if (isPoster) {
      payload.organizationType = values.organizationType;
      if (needsOrganizationName && values.organizationName.trim()) {
        payload.organizationName = values.organizationName.trim();
      }
    }

    setSubmitting(true);
    try {
      const user = await register(payload);
      navigate(roleHome(user.role), { replace: true });
    } catch (error) {
      const fieldErrors = error.status === 409 ? { email: error.message } : getFieldErrors(error);
      setErrors(fieldErrors);
      setFormError(Object.keys(fieldErrors).length > 0 ? 'Please fix the highlighted fields.' : getErrorMessage(error));
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <h1 className="font-display text-3xl font-bold">Create your account</h1>
      <p className="mt-1 text-muted">It takes about a minute. You can finish your profile afterwards.</p>

      {formError && <Alert className="mt-6">{formError}</Alert>}

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4 rounded-lg border border-line bg-white p-6">
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Account type</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {ROLE_CHOICES.map((choice) => (
              <label
                key={choice.value}
                className="cursor-pointer rounded-md border border-line p-3 has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand-600"
              >
                <input
                  type="radio"
                  name="role"
                  value={choice.value}
                  checked={role === choice.value}
                  onChange={() => setRole(choice.value)}
                  className="sr-only"
                />
                <span className="block font-medium">{choice.title}</span>
                <span className="block text-sm text-muted">{choice.text}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <FormField
          label={isPoster ? 'Your name' : 'Full name'}
          autoComplete="name"
          value={values.name}
          onChange={setField('name')}
          error={errors.name}
        />
        <FormField
          label="Email"
          type="email"
          autoComplete="email"
          value={values.email}
          onChange={setField('email')}
          error={errors.email}
        />
        <FormField
          label="Password"
          type="password"
          autoComplete="new-password"
          value={values.password}
          onChange={setField('password')}
          error={errors.password}
          hint="At least 8 characters, with a letter and a number."
        />
        <FormField
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          value={values.confirmPassword}
          onChange={setField('confirmPassword')}
          error={errors.confirmPassword}
        />

        {!isPoster && (
          <FormField
            label="University (optional)"
            value={values.university}
            onChange={setField('university')}
            error={errors.university}
          />
        )}

        {isPoster && (
          <>
            <FormField
              as="select"
              label="You are hiring as"
              value={values.organizationType}
              onChange={setField('organizationType')}
              error={errors.organizationType}
            >
              {ORGANIZATION_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </FormField>
            {needsOrganizationName && (
              <FormField
                label="Business or organization name"
                value={values.organizationName}
                onChange={setField('organizationName')}
                error={errors.organizationName}
              />
            )}
          </>
        )}

        <Button type="submit" loading={submitting} className="w-full">
          {submitting ? 'Creating account...' : 'Create account'}
        </Button>
      </form>

      <p className="mt-4 text-sm text-muted">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-brand-700 underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
