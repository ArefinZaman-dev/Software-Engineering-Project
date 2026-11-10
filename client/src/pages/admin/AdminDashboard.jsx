import ErrorState from '../../components/ui/ErrorState.jsx';
import Skeleton from '../../components/ui/Skeleton.jsx';
import useAsync from '../../hooks/useAsync.js';
import { getStats } from '../../services/adminService.js';

const STAT_CARDS = [
  { key: 'totalUsers', label: 'Total users' },
  { key: 'students', label: 'Students' },
  { key: 'posters', label: 'Posters' },
];

export default function AdminDashboard() {
  const { data, loading, error, reload } = useAsync(getStats, []);

  return (
    <div>
      <h1 className="font-display text-3xl font-bold">Admin dashboard</h1>
      <p className="mt-1 text-muted">A summary of the platform. Job, application, and report counts arrive with later increments.</p>

      <div className="mt-6">
        {loading && (
          <div className="grid gap-4 sm:grid-cols-3" aria-label="Loading statistics" role="status">
            {STAT_CARDS.map((card) => (
              <Skeleton key={card.key} className="h-24" />
            ))}
          </div>
        )}
        {error && <ErrorState message={error.message} onRetry={reload} />}
        {data && (
          <dl className="grid gap-4 sm:grid-cols-3">
            {STAT_CARDS.map((card) => (
              <div key={card.key} className="rounded-lg border border-line bg-white p-5">
                <dt className="text-sm text-muted">{card.label}</dt>
                <dd className="mt-1 font-display text-3xl font-bold">{data.stats[card.key]}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </div>
  );
}
