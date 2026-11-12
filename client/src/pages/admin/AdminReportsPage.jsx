import { useState } from 'react';
import AdminListShell from '../../components/admin/AdminListShell.jsx';
import SelectFilter from '../../components/admin/SelectFilter.jsx';
import Button from '../../components/ui/Button.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import useAction from '../../hooks/useAction.js';
import usePagedList from '../../hooks/usePagedList.js';
import {
  dismissReport,
  listReports,
  removeJob,
  resolveReport,
  startReportReview,
  suspendUser,
} from '../../services/adminService.js';
import {
  REPORT_REASON_OPTIONS,
  REPORT_STATUS_BADGE_STYLES,
  REPORT_STATUS_LABELS,
  formatDateTime,
  labelFor,
} from '../../utils/constants.js';

const STATUS_OPTIONS = [
  { value: 'OPEN', label: 'Needs attention' },
  { value: '', label: 'All reports' },
  ...Object.entries(REPORT_STATUS_LABELS).map(([value, label]) => ({ value, label })),
];

const isActive = (report) => report.status === 'PENDING' || report.status === 'REVIEWING';

export default function AdminReportsPage() {
  const list = usePagedList(listReports, { status: 'OPEN' });
  const { busy, error, run } = useAction(list.reload);
  const [notes, setNotes] = useState({});

  const noteOf = (id) => notes[id] || '';
  const setNote = (id, value) => setNotes((current) => ({ ...current, [id]: value }));

  return (
    <AdminListShell
      title="Reports"
      description="Look into what people have reported. Take action on the job or person if needed, then resolve or dismiss the report and leave a short note."
      filters={
        <SelectFilter label="Show" value={list.filters.status} onChange={(value) => list.setFilter('status', value)} options={STATUS_OPTIONS} />
      }
      list={list}
      items={list.data?.reports || []}
      total={list.data?.pagination.total}
      emptyTitle="No reports here."
      actionError={error}
    >
      {(list.data?.reports || []).map((report) => (
        <li key={report.id} className="rounded-lg border border-line bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-display font-semibold">
                {report.target.kind === 'JOB' ? 'Job' : 'User'}: {report.target.label}
              </p>
              <p className="text-sm text-muted">
                {labelFor(REPORT_REASON_OPTIONS, report.reason)} · reported by {report.reporter?.name || 'Unknown'}
                {report.reporter && ` (${report.reporter.email})`} · {formatDateTime(report.createdAt)}
              </p>
            </div>
            <StatusBadge status={report.status} labels={REPORT_STATUS_LABELS} styles={REPORT_STATUS_BADGE_STYLES} />
          </div>

          {report.description && <p className="mt-3 whitespace-pre-line rounded-md bg-paper p-3 text-sm">{report.description}</p>}

          {isActive(report) ? (
            <div className="mt-4 space-y-3">
              <div className="flex flex-wrap gap-2">
                {report.target.kind === 'JOB' && report.target.id && report.target.removedByAdmin === false && (
                  <Button
                    variant="danger"
                    loading={busy === `target:${report.id}`}
                    onClick={() =>
                      run(`target:${report.id}`, () => removeJob(report.target.id), `Remove the job "${report.target.label}" from the platform?`)
                    }
                  >
                    Remove this job
                  </Button>
                )}
                {report.target.kind === 'USER' && report.target.id && report.target.status === 'ACTIVE' && (
                  <Button
                    variant="danger"
                    loading={busy === `target:${report.id}`}
                    onClick={() =>
                      run(`target:${report.id}`, () => suspendUser(report.target.id), `Suspend ${report.target.label}? They will be blocked immediately.`)
                    }
                  >
                    Suspend this user
                  </Button>
                )}
                {report.status === 'PENDING' && (
                  <Button variant="secondary" loading={busy === `review:${report.id}`} onClick={() => run(`review:${report.id}`, () => startReportReview(report.id))}>
                    Start review
                  </Button>
                )}
              </div>

              <div>
                <label htmlFor={`note-${report.id}`} className="mb-1 block text-sm font-medium">
                  Note (optional)
                </label>
                <textarea
                  id={`note-${report.id}`}
                  rows={2}
                  maxLength={1000}
                  value={noteOf(report.id)}
                  onChange={(event) => setNote(report.id, event.target.value)}
                  className="block w-full rounded-md border border-line bg-white px-3 py-2 text-sm"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button loading={busy === `resolve:${report.id}`} onClick={() => run(`resolve:${report.id}`, () => resolveReport(report.id, noteOf(report.id)))}>
                  Resolve
                </Button>
                <Button
                  variant="secondary"
                  loading={busy === `dismiss:${report.id}`}
                  onClick={() => run(`dismiss:${report.id}`, () => dismissReport(report.id, noteOf(report.id)))}
                >
                  Dismiss
                </Button>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted">
              Closed {report.resolvedAt ? formatDateTime(report.resolvedAt) : ''}
              {report.resolvedBy && ` by ${report.resolvedBy.name}`}
              {report.resolutionNote && `: ${report.resolutionNote}`}
            </p>
          )}
        </li>
      ))}
    </AdminListShell>
  );
}
