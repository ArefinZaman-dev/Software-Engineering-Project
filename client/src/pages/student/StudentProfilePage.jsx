import { useState } from 'react';
import ProfileCompletionCard from '../../components/ProfileCompletionCard.jsx';
import Alert from '../../components/ui/Alert.jsx';
import Button from '../../components/ui/Button.jsx';
import FormField from '../../components/ui/FormField.jsx';
import RatingSummary from '../../components/ui/RatingSummary.jsx';
import SkillsInput from '../../components/ui/SkillsInput.jsx';
import useAuth from '../../hooks/useAuth.js';
import { updateStudentProfile } from '../../services/profileService.js';
import { AVAILABILITY_OPTIONS } from '../../utils/constants.js';
import { getErrorMessage, getFieldErrors } from '../../utils/errors.js';
import { validateStudentProfile } from '../../utils/validators.js';

function toFormValues(user) {
  const profile = user.studentProfile || {};
  return {
    name: user.name,
    location: user.location || '',
    bio: user.bio || '',
    university: profile.university || '',
    department: profile.department || '',
    skills: profile.skills || [],
    availability: profile.availability || 'FLEXIBLE',
    experience: profile.experience || '',
  };
}

export default function StudentProfilePage() {
  const { user, updateUser } = useAuth();
  const [values, setValues] = useState(() => toFormValues(user));
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState({ type: '', text: '' });
  const [saving, setSaving] = useState(false);

  const setField = (field) => (event) => setValues((previous) => ({ ...previous, [field]: event.target.value }));

  async function handleSubmit(event) {
    event.preventDefault();
    const validation = validateStudentProfile(values);
    setErrors(validation);
    setMessage({ type: '', text: '' });
    if (Object.keys(validation).length > 0) return;

    setSaving(true);
    try {
      const data = await updateStudentProfile(user.id, {
        name: values.name.trim(),
        location: values.location.trim(),
        bio: values.bio.trim(),
        university: values.university.trim(),
        department: values.department.trim(),
        skills: values.skills,
        availability: values.availability,
        experience: values.experience.trim(),
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
      <p className="mt-1 text-muted">Posters see this information when you apply to their jobs.</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <form onSubmit={handleSubmit} noValidate className="space-y-4 rounded-lg border border-line bg-white p-6 lg:col-span-2">
          {message.text && <Alert variant={message.type}>{message.text}</Alert>}

          <FormField label="Full name" autoComplete="name" value={values.name} onChange={setField('name')} error={errors.name} />
          <FormField
            label="Email"
            value={user.email}
            readOnly
            hint="Your email cannot be changed in Version 1."
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="University" value={values.university} onChange={setField('university')} error={errors.university} />
            <FormField label="Department" value={values.department} onChange={setField('department')} error={errors.department} />
          </div>
          <FormField label="Location" value={values.location} onChange={setField('location')} error={errors.location} placeholder="For example: Mirpur, Dhaka" />
          <FormField
            as="textarea"
            rows={4}
            label="About you"
            value={values.bio}
            onChange={setField('bio')}
            error={errors.bio}
            hint="A few sentences about what you study and what work you enjoy."
          />
          <SkillsInput value={values.skills} onChange={(skills) => setValues((previous) => ({ ...previous, skills }))} error={errors.skills} />
          <FormField as="select" label="Availability" value={values.availability} onChange={setField('availability')} error={errors.availability}>
            {AVAILABILITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </FormField>
          <FormField
            as="textarea"
            rows={4}
            label="Experience"
            value={values.experience}
            onChange={setField('experience')}
            error={errors.experience}
            hint="Past jobs, projects, or tutoring you have done."
          />
          <Button type="submit" loading={saving}>
            {saving ? 'Saving...' : 'Save profile'}
          </Button>
        </form>

        <aside className="space-y-6">
          <ProfileCompletionCard completion={user.profileCompletion} profilePath="/student/profile" />
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
