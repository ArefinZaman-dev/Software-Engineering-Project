import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Alert from '../components/ui/Alert.jsx';
import Button from '../components/ui/Button.jsx';
import FormField from '../components/ui/FormField.jsx';
import useAuth from '../hooks/useAuth.js';
import { roleHome } from '../routes/paths.js';
import { getErrorMessage, getFieldErrors } from '../utils/errors.js';
import { validateLogin } from '../utils/validators.js';

export default function LoginPage() {
  const { login, notice } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const setField = (field) => (event) => setValues((previous) => ({ ...previous, [field]: event.target.value }));

  async function handleSubmit(event) {
    event.preventDefault();
    const validation = validateLogin(values);
    setErrors(validation);
    setFormError('');
    if (Object.keys(validation).length > 0) return;

    setSubmitting(true);
    try {
      const user = await login({ email: values.email.trim(), password: values.password });
      navigate(location.state?.from || roleHome(user.role), { replace: true });
    } catch (error) {
      setErrors(getFieldErrors(error));
      setFormError(getErrorMessage(error));
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="font-display text-3xl font-bold">Log in</h1>
      <p className="mt-1 text-muted">Welcome back. Enter your details to continue.</p>

      {notice && <Alert variant="info" className="mt-6">{notice}</Alert>}
      {formError && <Alert className="mt-6">{formError}</Alert>}

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4 rounded-lg border border-line bg-white p-6">
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
          autoComplete="current-password"
          value={values.password}
          onChange={setField('password')}
          error={errors.password}
        />
        <Button type="submit" loading={submitting} className="w-full">
          {submitting ? 'Logging in...' : 'Log in'}
        </Button>
      </form>

      <p className="mt-4 text-sm text-muted">
        New to CampusGig?{' '}
        <Link to="/register" className="font-medium text-brand-700 underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
