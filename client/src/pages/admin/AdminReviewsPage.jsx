import AdminListShell from '../../components/admin/AdminListShell.jsx';
import SelectFilter from '../../components/admin/SelectFilter.jsx';
import Button from '../../components/ui/Button.jsx';
import RatingStars from '../../components/ui/RatingStars.jsx';
import useAction from '../../hooks/useAction.js';
import usePagedList from '../../hooks/usePagedList.js';
import { listAdminReviews, removeReview, restoreReview } from '../../services/adminService.js';
import { formatDay } from '../../utils/constants.js';

const VISIBILITY_OPTIONS = [
  { value: 'all', label: 'All reviews' },
  { value: 'visible', label: 'Visible' },
  { value: 'removed', label: 'Removed by admin' },
];

export default function AdminReviewsPage() {
  const list = usePagedList(listAdminReviews, { visibility: 'all' });
  const { busy, error, run } = useAction(list.reload);

  return (
    <AdminListShell
      title="Reviews"
      description="Remove a review that is abusive or false. It stops counting toward the person's rating straight away, and the author cannot write a replacement."
      filters={
        <SelectFilter label="Visibility" value={list.filters.visibility} onChange={(value) => list.setFilter('visibility', value)} options={VISIBILITY_OPTIONS} />
      }
      list={list}
      items={list.data?.reviews || []}
      total={list.data?.pagination.total}
      emptyTitle="No reviews match."
      actionError={error}
    >
      {(list.data?.reviews || []).map((review) => (
        <li key={review.id} className="rounded-lg border border-line bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2">
              <RatingStars rating={review.rating} />
              <span className="text-sm text-muted">{review.rating} out of 5</span>
              {review.removedByAdmin && (
                <span className="inline-flex rounded-full bg-danger-soft px-2.5 py-1 text-xs font-medium text-danger">Removed</span>
              )}
            </p>
            {review.removedByAdmin ? (
              <Button variant="secondary" loading={busy === review.id} onClick={() => run(review.id, () => restoreReview(review.id))}>
                Restore
              </Button>
            ) : (
              <Button
                variant="danger"
                loading={busy === review.id}
                onClick={() => run(review.id, () => removeReview(review.id), 'Remove this review? The rating will be recalculated.')}
              >
                Remove
              </Button>
            )}
          </div>
          {review.comment ? <p className="mt-2 whitespace-pre-line">{review.comment}</p> : <p className="mt-2 text-sm text-muted">No comment.</p>}
          <p className="mt-2 text-xs text-muted">
            {review.reviewer?.name || 'Unknown'} reviewed {review.reviewee?.name || 'Unknown'}
            {review.job && ` · ${review.job.title}`} · {formatDay(review.createdAt)}
          </p>
        </li>
      ))}
    </AdminListShell>
  );
}
