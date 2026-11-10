import ProfileCompletionCard from '../../components/ProfileCompletionCard.jsx';
import RatingSummary from '../../components/ui/RatingSummary.jsx';
import useAuth from '../../hooks/useAuth.js';
import { ORGANIZATION_TYPE_OPTIONS, labelFor } from '../../utils/constants.js';

export default function PosterDashboard() {
  const { user } = useAuth();
  const profile = user.posterProfile || {};
  const firstName = user.name.split(' ')[0];

  return (
    <div>
      <h1 className="font-display text-3xl font-bold">Welcome, {firstName}</h1>
      <p className="mt-1 text-muted">A clear profile helps students decide to work with you.</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <ProfileCompletionCard completion={user.profileCompletion} profilePath="/poster/profile" />

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
              <dt className="text-muted">Hiring as</dt>
              <dd className="font-medium">{labelFor(ORGANIZATION_TYPE_OPTIONS, profile.organizationType)}</dd>
            </div>
            <div>
              <dt className="text-muted">Organization</dt>
              <dd className="font-medium">{profile.organizationName || 'Not applicable'}</dd>
            </div>
            <div>
              <dt className="text-muted">Location</dt>
              <dd className="font-medium">{user.location || 'Not added yet'}</dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
}
