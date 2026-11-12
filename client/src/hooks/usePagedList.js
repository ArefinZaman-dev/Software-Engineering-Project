import { useState } from 'react';
import useAsync from './useAsync.js';

// Shared by the admin list pages: keeps the filters and current page, refetches when either
// changes, and goes back to page 1 whenever a filter changes.
export default function usePagedList(fetcher, initialFilters = {}) {
  const [filters, setFilters] = useState(initialFilters);
  const [page, setPage] = useState(1);
  const state = useAsync(() => fetcher({ ...filters, page }), [JSON.stringify(filters), page]);

  function setFilter(name, value) {
    setFilters((current) => ({ ...current, [name]: value }));
    setPage(1);
  }

  return { ...state, filters, setFilter, page, setPage };
}
