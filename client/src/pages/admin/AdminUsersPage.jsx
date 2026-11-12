import AdminListShell from '../../components/admin/AdminListShell.jsx';
import SearchBox from '../../components/admin/SearchBox.jsx';
import SelectFilter from '../../components/admin/SelectFilter.jsx';
import Button from '../../components/ui/Button.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import useAction from '../../hooks/useAction.js';
import usePagedList from '../../hooks/usePagedList.js';
import { listUsers, reactivateUser, suspendUser } from '../../services/adminService.js';
import {
  ROLES,
  ROLE_LABELS,
  USER_STATUS_BADGE_STYLES,
  USER_STATUS_LABELS,
  formatDay,
} from '../../utils/constants.js';

const ROLE_OPTIONS = [{ value: '', label: 'All roles' }, ...Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }))];
const STATUS_OPTIONS = [
  { value: '', label: 'Any status' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'SUSPENDED', label: 'Suspended' },
];

export default function AdminUsersPage() {
  const list = usePagedList(listUsers, { search: '', role: '', status: '' });
  const { busy, error, run } = useAction(list.reload);

  return (
    <AdminListShell
      title="Users"
      description="Find people, and suspend or reactivate accounts. A suspended person is blocked immediately and hidden from the platform."
      filters={
        <div className="flex flex-wrap items-end gap-3">
          <SearchBox label="Search by name or email" placeholder="e.g. nusrat" onSearch={(value) => list.setFilter('search', value)} />
          <SelectFilter label="Role" value={list.filters.role} onChange={(value) => list.setFilter('role', value)} options={ROLE_OPTIONS} />
          <SelectFilter label="Status" value={list.filters.status} onChange={(value) => list.setFilter('status', value)} options={STATUS_OPTIONS} />
        </div>
      }
      list={list}
      items={list.data?.users || []}
      total={list.data?.pagination.total}
      emptyTitle="No users match."
      actionError={error}
    >
      {(list.data?.users || []).map((user) => (
        <li key={user.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-white p-4">
          <div className="min-w-0">
            <p className="font-display font-semibold">{user.name}</p>
            <p className="break-all text-sm text-muted">{user.email}</p>
            <p className="mt-1 text-xs text-muted">
              {ROLE_LABELS[user.role]} · joined {formatDay(user.createdAt)}
              {user.ratingSummary?.count > 0 && ` · ${user.ratingSummary.average} (${user.ratingSummary.count} reviews)`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={user.status} labels={USER_STATUS_LABELS} styles={USER_STATUS_BADGE_STYLES} />
            {user.role !== ROLES.ADMIN && user.status === 'ACTIVE' && (
              <Button
                variant="danger"
                loading={busy === user.id}
                onClick={() =>
                  run(user.id, () => suspendUser(user.id), `Suspend ${user.name}? They will be logged out of every session and hidden from the platform.`)
                }
              >
                Suspend
              </Button>
            )}
            {user.role !== ROLES.ADMIN && user.status === 'SUSPENDED' && (
              <Button variant="secondary" loading={busy === user.id} onClick={() => run(user.id, () => reactivateUser(user.id))}>
                Reactivate
              </Button>
            )}
          </div>
        </li>
      ))}
    </AdminListShell>
  );
}
