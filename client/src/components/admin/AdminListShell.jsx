import Alert from '../ui/Alert.jsx';
import EmptyState from '../ui/EmptyState.jsx';
import ErrorState from '../ui/ErrorState.jsx';
import Pagination from '../ui/Pagination.jsx';
import Skeleton from '../ui/Skeleton.jsx';

// The loading / error / empty / list / pagination frame shared by every admin list page, so each
// page only has to describe its filters and how one row looks.
export default function AdminListShell({
  title,
  description,
  filters,
  list,
  items,
  total,
  emptyTitle,
  actionError,
  children,
}) {
  const { data, loading, error, reload, page, setPage } = list;

  return (
    <div>
      <h1 className="font-display text-3xl font-bold">{title}</h1>
      <p className="mt-1 text-muted">{description}</p>

      <div className="mt-5">{filters}</div>

      {actionError && <Alert className="mt-4">{actionError}</Alert>}

      <div className="mt-5">
        {loading && !data && (
          <div className="space-y-3" role="status" aria-label="Loading">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        )}

        {error && <ErrorState message={error.message} onRetry={reload} />}

        {data && items.length === 0 && <EmptyState title={emptyTitle} description="Try changing the filters." />}

        {data && items.length > 0 && (
          <>
            <p className="mb-3 text-sm text-muted">{total} found</p>
            <ul className="space-y-3">{children}</ul>
            <Pagination page={page} totalPages={data.pagination.totalPages} onChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
