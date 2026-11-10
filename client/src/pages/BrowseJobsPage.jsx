import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import EmptyState from '../components/ui/EmptyState.jsx';
import ErrorState from '../components/ui/ErrorState.jsx';
import Pagination from '../components/ui/Pagination.jsx';
import Skeleton from '../components/ui/Skeleton.jsx';
import JobCard from '../components/JobCard.jsx';
import useAsync from '../hooks/useAsync.js';
import { listCategories } from '../services/categoryService.js';
import { listJobs } from '../services/jobService.js';
import { SORT_OPTIONS, WORK_TYPE_OPTIONS } from '../utils/constants.js';

const DEFAULT_FILTERS = { search: '', category: '', location: '', workType: '', sort: 'newest' };

export default function BrowseJobsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState(() => ({
    ...DEFAULT_FILTERS,
    ...Object.fromEntries(searchParams.entries()),
  }));
  const [searchDraft, setSearchDraft] = useState(filters.search);
  const page = Number(searchParams.get('page')) || 1;

  const { data: categoriesData } = useAsync(listCategories, []);
  const { data, loading, error, reload } = useAsync(
    () => listJobs({ ...filters, page }),
    [JSON.stringify(filters), page]
  );

  // Keep the URL shareable/bookmarkable and in sync with the visible filters.
  useEffect(() => {
    const params = Object.fromEntries(Object.entries({ ...filters, page }).filter(([, v]) => v));
    setSearchParams(params, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, page]);

  function updateFilter(field, value) {
    setFilters((previous) => ({ ...previous, [field]: value }));
  }

  function handleSearchSubmit(event) {
    event.preventDefault();
    updateFilter('search', searchDraft.trim());
  }

  function goToPage(nextPage) {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      next.set('page', String(nextPage));
      return next;
    });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-3xl font-bold">Browse jobs</h1>
      <p className="mt-1 text-muted">Short-term jobs and tasks posted by individuals, businesses, and organizations.</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <label htmlFor="job-search" className="sr-only">
              Search jobs
            </label>
            <input
              id="job-search"
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Search jobs"
              className="h-10 w-full rounded-md border border-line bg-white px-3 text-sm"
            />
          </form>

          <div>
            <label htmlFor="filter-category" className="mb-1 block text-sm font-medium">
              Category
            </label>
            <select
              id="filter-category"
              value={filters.category}
              onChange={(event) => updateFilter('category', event.target.value)}
              className="h-10 w-full rounded-md border border-line bg-white px-3 text-sm"
            >
              <option value="">All categories</option>
              {categoriesData?.categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="filter-worktype" className="mb-1 block text-sm font-medium">
              Work type
            </label>
            <select
              id="filter-worktype"
              value={filters.workType}
              onChange={(event) => updateFilter('workType', event.target.value)}
              className="h-10 w-full rounded-md border border-line bg-white px-3 text-sm"
            >
              <option value="">Any</option>
              {WORK_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="filter-location" className="mb-1 block text-sm font-medium">
              Location
            </label>
            <input
              id="filter-location"
              value={filters.location}
              onChange={(event) => updateFilter('location', event.target.value)}
              placeholder="For example: Dhaka"
              className="h-10 w-full rounded-md border border-line bg-white px-3 text-sm"
            />
          </div>

          <div>
            <label htmlFor="filter-sort" className="mb-1 block text-sm font-medium">
              Sort by
            </label>
            <select
              id="filter-sort"
              value={filters.sort}
              onChange={(event) => updateFilter('sort', event.target.value)}
              className="h-10 w-full rounded-md border border-line bg-white px-3 text-sm"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </aside>

        <div>
          {loading && (
            <div className="grid gap-4 sm:grid-cols-2" aria-label="Loading jobs" role="status">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-40" />
              ))}
            </div>
          )}

          {error && <ErrorState message={error.message} onRetry={reload} />}

          {data && data.jobs.length === 0 && (
            <EmptyState title="No jobs found." description="Try a different search term or clear your filters." />
          )}

          {data && data.jobs.length > 0 && (
            <>
              <p className="mb-3 text-sm text-muted">{data.pagination.total} jobs found</p>
              <div className="grid gap-4 sm:grid-cols-2">
                {data.jobs.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
              <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} onChange={goToPage} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
