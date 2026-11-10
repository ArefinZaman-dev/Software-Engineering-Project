import { useState } from 'react';
import ProfileCompletionCard from '../../components/ProfileCompletionCard.jsx';
import Alert from '../../components/ui/Alert.jsx';
import Button from '../../components/ui/Button.jsx';
import FormField from '../../components/ui/FormField.jsx';
import RatingSummary from '../../components/ui/RatingSummary.jsx';
import useAuth from '../../hooks/useAuth.js';
import { updatePosterProfile } from '../../services/profileService.js';
import { ORGANIZATION_TYPE_OPTIONS } from '../../utils/constants.js';
import { getErrorMessage, getFieldErrors } from '../../utils/errors.js';
import { validatePosterProfile } from '../../utils/validators.js';

function toFormValues(user) {
  const profile = user.posterProfile || {};
  return {
    name: user.name,
    location: user.location || '',
    bio: user.bio || '',
    organizationType: profile.organizationType || 'INDIVIDUAL',
    organizationName: profile.organizationName || '',
    website: profile.website || '',
  };
}

export default function PosterProfilePage() {
  const { user, updateUser } = useAuth();
  const [values, setValues] = useState(() => toFormValues(user));
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState({ type: '', text: '' });
  const [saving, setSaving] = useState(false);

  const setField = (field) => (event) => setValues((previous) => ({ ...previous, [field]: event.target.value }));
  const isIndividual = values.organizationType === 'INDIVIDUAL';

  async function handleSubmit(event) {
    event.preventDefault();
    const validation = validatePosterProfile(values);
    setErrors(validation);
    setMessage({ type: '', text: '' });
    if (Object.keys(validation).length > 0) return;

    setSaving(true);
    try {
      const data = await updatePosterProfile(user.id, {
        name: values.name.trim(),
        location: values.location.trim(),
        bio: values.bio.trim(),
        organizationType: values.organizationType,
        organizationName: isIndividual ? '' : values.organizationName.trim(),
        website: values.website.trim(),
      });
      updateUser(data.user);
      setValues(toFormValues(data.user));
      setMessage({ type: 'success', text: 'Your profile has been saved.' });
    } catch (error) {
      const fieldErrors = getFieldErrors(error);
      setErrors(fieldErrors);
      setMessage({
        type: 'error',
        text: Object.keys(fieldErrors).length > 0 ? 'Please fix the highlighted fields.' : getErrorMessage(error),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-bold">My profile</h1>
      <p className="mt-1 text-muted">Students see this information before they apply to your jobs.</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <form onSubmit={handleSubmit} noValidate className="space-y-4 rounded-lg border border-line bg-white p-6 lg:col-span-2">
          {message.text && <Alert variant={message.type}>{message.text}</Alert>}

          <FormField label="Your name" autoComplete="name" value={values.name} onChange={setField('name')} error={errors.name} />
          <FormField label="Email" value={user.email} readOnly hint="Your email cannot be changed in Version 1." />
          <FormField as="select" label="You are hiring as" value={values.organizationType} onChange={setField('organizationType')} error={errors.organizationType}>
            {ORGANIZATION_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </FormField>
          {!isIndividual && (
            <FormField label="Business or organization name" value={values.organizationName} onChange={setField('organizationName')} error={errors.organizationName} />
          )}
          <FormField label="Location" value={values.location} onChange={setField('location')} error={errors.location} placeholder="For example: Banani, Dhaka" />
          <FormField
            as="textarea"
            rows={4}
            label="About you or your organization"
            value={values.bio}
            onChange={setField('bio')}
            error={errors.bio}
            hint="What kind of work do you usually need help with?"
          />
          <FormField label="Website (optional)" type="url" value={values.website} onChange={setField('website')} error={errors.website} placeholder="https://" />
          <Button type="submit" loading={saving}>
            {saving ? 'Saving...' : 'Save profile'}
          </Button>
        </form>

        <aside className="space-y-6">
          <ProfileCompletionCard completion={user.profileCompletion} profilePath="/poster/profile" />
          <section className="rounded-lg border border-line bg-white p-5" aria-labelledby="profile-rating-heading">
            <h2 id="profile-rating-heading" className="font-display text-lg font-semibold">Your rating</h2>
            <div className="mt-3">
              <RatingSummary summary={user.ratingSummary} />
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
