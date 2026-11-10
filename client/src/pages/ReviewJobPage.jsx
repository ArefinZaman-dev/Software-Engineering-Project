import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Alert from '../components/ui/Alert.jsx';
import Button from '../components/ui/Button.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import ErrorState from '../components/ui/ErrorState.jsx';
import FormField from '../components/ui/FormField.jsx';
import PageLoader from '../components/ui/PageLoader.jsx';
import RatingStars from '../components/ui/RatingStars.jsx';
import useAsync from '../hooks/useAsync.js';
import useAuth from '../hooks/useAuth.js';
import { createReview, getJobReviews } from '../services/reviewService.js';
import { RATING_LABELS, REVIEW_COMMENT_MAX_LENGTH, ROLES, formatDay } from '../utils/constants.js';
import { getErrorMessage, getFieldErrors } from '../utils/errors.js';

function ReviewCard({ title, review }) {
  return (
    <section className="rounded-lg border border-line bg-white p-5" aria-label={title}>
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      <p className="mt-2 flex items-center gap-2">
        <RatingStars rating={review.rating} />
        <span className="text-sm text-muted">{review.rating} out of 5</span>
      </p>
      {review.comment ? (
        <p className="mt-2 whitespace-pre-line">{review.comment}</p>
      ) : (
        <p className="mt-2 text-sm text-muted">No comment was left.</p>
      )}
      <p className="mt-2 text-xs text-muted">{formatDay(review.createdAt)}</p>
    </section>
  );
}

export default function ReviewJobPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { data, loading, error, reload } = useAsync(() => getJobReviews(id), [id]);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const backPath = user.role === ROLES.POSTER ? '/poster/jobs' : '/student/applications';
  const backLabel = user.role === ROLES.POSTER ? '← Back to my jobs' : '← Back to my applications';

  if (loading && !data) return <PageLoader label="Loading..." />;
  if (error) {
    return (
      <ErrorState
        message={error.status === 404 ? 'You can only review jobs you took part in.' : error.message}
        onRetry={error.status === 404 ? undefined : reload}
      />
    );
  }

  const { job, counterpart, given, received, canReview } = data;

  async function handleSubmit(event) {
    event.preventDefault();
    const found = {};
    if (!rating) found.rating = 'Choose a rating from 1 to 5.';
    if (comment.length > REVIEW_COMMENT_MAX_LENGTH) {
      found.comment = `Comment must be at most ${REVIEW_COMMENT_MAX_LENGTH} characters.`;
    }
    setErrors(found);
    setFormError('');
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    try {
      await createReview(id, { rating, comment: comment.trim() });
      reload();
    } catch (err) {
      setErrors(getFieldErrors(err));
      setFormError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <Link to={backPath} className="text-sm text-brand-700 underline">
        {backLabel}
      </Link>
      <h1 className="mt-3 font-display text-3xl font-bold">Reviews</h1>
      <p className="mt-1 text-muted">
        <Link to={`/jobs/${job.id}`} className="underline">
          {job.title}
        </Link>
      </p>

      {job.status !== 'COMPLETED' ? (
        <div className="mt-6">
          <EmptyState
            title="Reviews open once the job is completed."
            description="When the poster marks this job as completed, you and the other person can each leave one review."
          />
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {given && <ReviewCard title="Your review" review={given} />}

          {!given && canReview && counterpart && (
            <form onSubmit={handleSubmit} noValidate className="space-y-4 rounded-lg border border-line bg-white p-6">
              <h2 className="font-display text-lg font-semibold">How was working with {counterpart.name}?</h2>
              {formError && <Alert>{formError}</Alert>}

              <fieldset aria-describedby={errors.rating ? 'rating-error' : undefined}>
                <legend className="mb-1 text-sm font-medium">Rating</legend>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <label
                      key={value}
                      className="flex cursor-pointer items-center gap-2 rounded-md border border-line px-3 py-2 text-sm has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50"
                    >
                      <input
                        type="radio"
                        name="rating"
                        value={value}
                        checked={rating === value}
                        onChange={() => setRating(value)}
                      />
                      {value} · {RATING_LABELS[value]}
                    </label>
                  ))}
                </div>
                {errors.rating && (
                  <p id="rating-error" className="mt-1 text-sm text-danger">
                    {errors.rating}
                  </p>
                )}
              </fieldset>

              <FormField
                as="textarea"
                rows={4}
                label="Comment (optional)"
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                error={errors.comment}
                maxLength={REVIEW_COMMENT_MAX_LENGTH}
                hint="Be honest and specific. You can only review once, and it cannot be edited afterwards."
              />

              <Button type="submit" loading={submitting}>
                Submit review
              </Button>
            </form>
          )}

          {!given && !canReview && (
            <Alert variant="info">Your review for this job was removed by an admin and cannot be replaced.</Alert>
          )}

          {received ? (
            <ReviewCard title={`Review from ${received.reviewer.name}`} review={received} />
          ) : (
            <p className="text-sm text-muted">The other person has not reviewed this job yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
