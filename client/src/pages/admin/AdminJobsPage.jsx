import { Link } from 'react-router-dom';
import AdminListShell from '../../components/admin/AdminListShell.jsx';
import SearchBox from '../../components/admin/SearchBox.jsx';
import SelectFilter from '../../components/admin/SelectFilter.jsx';
import Button from '../../components/ui/Button.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import useAction from '../../hooks/useAction.js';
import usePagedList from '../../hooks/usePagedList.js';
import { listAdminJobs, removeJob, restoreJob } from '../../services/adminService.js';
import { JOB_STATUS_LABELS, formatDay } from '../../utils/constants.js';

const STATUS_OPTIONS = [
  { value: '', label: 'Any status' },
  ...Object.entries(JOB_STATUS_LABELS).map(([value, label]) => ({ value, label })),
];
const VISIBILITY_OPTIONS = [
  { value: 'all', label: 'All jobs' },
  { value: 'visible', label: 'Visible' },
  { value: 'removed', label: 'Removed by admin' },
];

export default function AdminJobsPage() {
  const list = usePagedList(listAdminJobs, { search: '', status: '', visibility: 'all' });
  const { busy, error, run } = useAction(list.reload);

  return (
    <AdminListShell
      title="Jobs"
      description="Remove a job that breaks the rules. A removed job disappears from the platform but nothing is deleted, and you can restore it."
      filters={
        <div className="flex flex-wrap items-end gap-3">
          <SearchBox label="Search by title" placeholder="e.g. poster design" onSearch={(value) => list.setFilter('search', value)} />
          <SelectFilter label="Status" value={list.filters.status} onChange={(value) => list.setFilter('status', value)} options={STATUS_OPTIONS} />
          <SelectFilter label="Visibility" value={list.filters.visibility} onChange={(value) => list.setFilter('visibility', value)} options={VISIBILITY_OPTIONS} />
        </div>
      }
      list={list}
      items={list.data?.jobs || []}
      total={list.data?.pagination.total}
      emptyTitle="No jobs match."
      actionError={error}
    >
      {(list.data?.jobs || []).map((job) => (
        <li key={job.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-white p-4">
          <div className="min-w-0">
            <p className="font-display font-semibold">
              {job.removedByAdmin ? (
                job.title
              ) : (
                <Link to={`/jobs/${job.id}`} className="hover:underline">
                  {job.title}
                </Link>
              )}
            </p>
            <p className="text-sm text-muted">
              {job.poster ? `${job.poster.name} (${job.poster.email})` : 'Unknown poster'}
              {job.category && ` · ${job.category.name}`}
            </p>
            <p className="mt-1 text-xs text-muted">
              Posted {formatDay(job.createdAt)} · budget {job.budget}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={job.status} />
            {job.removedByAdmin && (
              <span className="inline-flex rounded-full bg-danger-soft px-2.5 py-1 text-xs font-medium text-danger">Removed</span>
            )}
            {job.removedByAdmin ? (
              <Button variant="secondary" loading={busy === job.id} onClick={() => run(job.id, () => restoreJob(job.id))}>
                Restore
              </Button>
            ) : (
              <Button
                variant="danger"
                loading={busy === job.id}
                onClick={() => run(job.id, () => removeJob(job.id), `Remove "${job.title}" from the platform? You can restore it later.`)}
              >
                Remove
              </Button>
            )}
          </div>
        </li>
      ))}
    </AdminListShell>
  );
}
