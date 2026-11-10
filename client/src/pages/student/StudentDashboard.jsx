import ProfileCompletionCard from '../../components/ProfileCompletionCard.jsx';
import RatingSummary from '../../components/ui/RatingSummary.jsx';
import useAuth from '../../hooks/useAuth.js';
import { AVAILABILITY_OPTIONS, labelFor } from '../../utils/constants.js';

export default function StudentDashboard() {
  const { user } = useAuth();
  const profile = user.studentProfile || {};
  const firstName = user.name.split(' ')[0];

  return (
    <div>
      <h1 className="font-display text-3xl font-bold">Welcome, {firstName}</h1>
      <p className="mt-1 text-muted">A complete profile helps posters trust you.</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <ProfileCompletionCard completion={user.profileCompletion} profilePath="/student/profile" />

        <section className="rounded-lg border border-line bg-white p-5" aria-labelledby="rating-heading">
          <h2 id="rating-heading" className="font-display text-lg font-semibold">Your rating</h2>
          <div className="mt-3">
            <RatingSummary summary={user.ratingSummary} />
          </div>
        </section>

        <section className="rounded-lg border border-line bg-white p-5 lg:col-span-2" aria-labelledby="details-heading">
          <h2 id="details-heading" className="font-display text-lg font-semibold">Your details</h2>
          <dl className="mt-3 grid gap-4 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-muted">University</dt>
              <dd className="font-medium">{profile.university || 'Not added yet'}</dd>
            </div>
            <div>
              <dt className="text-muted">Department</dt>
              <dd className="font-medium">{profile.department || 'Not added yet'}</dd>
            </div>
            <div>
              <dt className="text-muted">Availability</dt>
              <dd className="font-medium">{labelFor(AVAILABILITY_OPTIONS, profile.availability)}</dd>
            </div>
          </dl>
          {profile.skills?.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2" aria-label="Your skills">
              {profile.skills.map((skill) => (
                <li key={skill} className="rounded-full bg-brand-50 px-3 py-1 text-sm text-brand-700">
                  {skill}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
