import { useParams } from 'react-router-dom';
import ReportForm from '../components/ReportForm.jsx';
import Avatar from '../components/ui/Avatar.jsx';
import ErrorState from '../components/ui/ErrorState.jsx';
import PageLoader from '../components/ui/PageLoader.jsx';
import RatingStars from '../components/ui/RatingStars.jsx';
import RatingSummary from '../components/ui/RatingSummary.jsx';
import useAsync from '../hooks/useAsync.js';
import useAuth from '../hooks/useAuth.js';
import { getPosterProfile, getStudentProfile } from '../services/profileService.js';
import { getUserReviews } from '../services/reviewService.js';
import { AVAILABILITY_OPTIONS, ORGANIZATION_TYPE_OPTIONS, ROLES, formatDay, labelFor } from '../utils/constants.js';

// Read-only profile that other logged-in users can see. It never shows email or account status.
export default function PublicProfilePage({ role }) {
  const { id } = useParams();
  const { user: viewer } = useAuth();
  const isStudent = role === ROLES.STUDENT;
  const { data, loading, error, reload } = useAsync(
    () => (isStudent ? getStudentProfile(id) : getPosterProfile(id)),
    [id, isStudent]
  );
  const reviewsState = useAsync(() => getUserReviews(id), [id]);

  if (loading) return <PageLoader label="Loading profile..." />;
  if (error) {
    return (
      <ErrorState
        message={error.status === 404 ? 'This profile does not exist or is not available.' : error.message}
        onRetry={error.status === 404 ? undefined : reload}
      />
    );
  }

  const { profile } = data;
  const student = profile.studentProfile;
  const poster = profile.posterProfile;
  const reviews = reviewsState.data?.reviews || [];
  // Students and posters can report other people; nobody can report themselves.
  const canReport = (viewer.role === ROLES.STUDENT || viewer.role === ROLES.POSTER) && viewer.id !== id;

  return (
    <article className="rounded-lg border border-line bg-white p-6">
      <div className="flex items-center gap-4">
        <Avatar name={profile.name} size="lg" />
        <div>
          <h1 className="font-display text-2xl font-bold">{profile.name}</h1>
          <p className="text-sm text-muted">
            {isStudent ? 'Student' : labelFor(ORGANIZATION_TYPE_OPTIONS, poster?.organizationType)}
            {profile.location ? ` from ${profile.location}` : ''}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <RatingSummary summary={profile.ratingSummary} />
      </div>

      {profile.bio && <p className="mt-5 max-w-prose">{profile.bio}</p>}

      <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
        {isStudent && (
          <>
            <div>
              <dt className="text-muted">University</dt>
              <dd className="font-medium">{student?.university || 'Not added'}</dd>
            </div>
            <div>
              <dt className="text-muted">Department</dt>
              <dd className="font-medium">{student?.department || 'Not added'}</dd>
            </div>
            <div>
              <dt className="text-muted">Availability</dt>
              <dd className="font-medium">{labelFor(AVAILABILITY_OPTIONS, student?.availability)}</dd>
            </div>
          </>
        )}
        {!isStudent && poster?.organizationName && (
          <div>
            <dt className="text-muted">Organization</dt>
            <dd className="font-medium">{poster.organizationName}</dd>
          </div>
        )}
        {!isStudent && poster?.website && (
          <div>
            <dt className="text-muted">Website</dt>
            <dd className="font-medium">
              <a href={poster.website} target="_blank" rel="noopener noreferrer nofollow" className="text-brand-700 underline">
                {poster.website}
              </a>
            </dd>
          </div>
        )}
      </dl>

      {isStudent && student?.skills?.length > 0 && (
        <ul className="mt-5 flex flex-wrap gap-2" aria-label="Skills">
          {student.skills.map((skill) => (
            <li key={skill} className="rounded-full bg-brand-50 px-3 py-1 text-sm text-brand-700">
              {skill}
            </li>
          ))}
        </ul>
      )}

      {isStudent && student?.experience && (
        <section className="mt-5" aria-labelledby="experience-heading">
          <h2 id="experience-heading" className="font-display text-lg font-semibold">Experience</h2>
          <p className="mt-1 max-w-prose whitespace-pre-line text-muted">{student.experience}</p>
        </section>
      )}

      {reviews.length > 0 && (
        <section className="mt-6 border-t border-line pt-5" aria-labelledby="reviews-heading">
          <h2 id="reviews-heading" className="font-display text-lg font-semibold">
            Reviews
          </h2>
          <ul className="mt-3 space-y-3">
            {reviews.map((review) => (
              <li key={review.id} className="rounded-md bg-paper p-4">
                <p className="flex flex-wrap items-center gap-2">
                  <RatingStars rating={review.rating} />
                  <span className="text-sm text-muted">{review.rating} out of 5</span>
                </p>
                {review.comment && <p className="mt-2 whitespace-pre-line">{review.comment}</p>}
                <p className="mt-2 text-xs text-muted">
                  {review.reviewer.name}
                  {review.job?.title ? ` · ${review.job.title}` : ''} · {formatDay(review.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
      {reviewsState.error && <p className="mt-6 text-sm text-muted">Reviews could not be loaded right now.</p>}

      {canReport && (
        <div className="mt-6 border-t border-line pt-4">
          <ReportForm targetType="USER" targetId={id} triggerLabel="Report this user" />
        </div>
      )}
    </article>
  );
}
