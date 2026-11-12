import { Link } from 'react-router-dom';
import ErrorState from '../../components/ui/ErrorState.jsx';
import Skeleton from '../../components/ui/Skeleton.jsx';
import useAsync from '../../hooks/useAsync.js';
import { getStats } from '../../services/adminService.js';

const GROUPS = [
  {
    title: 'People',
    to: '/admin/users',
    cards: [
      { key: 'totalUsers', label: 'Total users' },
      { key: 'students', label: 'Students' },
      { key: 'posters', label: 'Posters' },
      { key: 'suspendedUsers', label: 'Suspended' },
    ],
  },
  {
    title: 'Jobs',
    to: '/admin/jobs',
    cards: [
      { key: 'totalJobs', label: 'Total jobs' },
      { key: 'openJobs', label: 'Open (visible)' },
      { key: 'inProgressJobs', label: 'In progress' },
      { key: 'completedJobs', label: 'Completed' },
      { key: 'removedJobs', label: 'Removed by admin' },
    ],
  },
  {
    title: 'Activity and moderation',
    cards: [
      { key: 'totalApplications', label: 'Applications' },
      { key: 'totalReviews', label: 'Reviews', to: '/admin/reviews' },
      { key: 'openReports', label: 'Open reports', to: '/admin/reports', highlight: true },
    ],
  },
];

function StatCard({ card, value }) {
  const body = (
    <>
      <dt className="text-sm text-muted">{card.label}</dt>
      <dd className="mt-1 font-display text-3xl font-bold">{value}</dd>
    </>
  );
  const classes = `rounded-lg border bg-white p-5 ${
    card.highlight && value > 0 ? 'border-danger' : 'border-line'
  }`;

  return card.to ? (
    <Link to={card.to} className={`${classes} block hover:bg-brand-50`}>
      {body}
    </Link>
  ) : (
    <div className={classes}>{body}</div>
  );
}

export default function AdminDashboard() {
  const { data, loading, error, reload } = useAsync(getStats, []);

  return (
    <div>
      <h1 className="font-display text-3xl font-bold">Admin dashboard</h1>
      <p className="mt-1 text-muted">A summary of the platform. Use the menu to moderate users, jobs, reviews, and reports.</p>

      <div className="mt-6 space-y-8">
        {loading && !data && (
          <div className="grid gap-4 sm:grid-cols-3" aria-label="Loading statistics" role="status">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        )}
        {error && <ErrorState message={error.message} onRetry={reload} />}
        {data &&
          GROUPS.map((group) => (
            <section key={group.title} aria-label={group.title}>
              <h2 className="mb-3 font-display text-lg font-semibold">
                {group.to ? (
                  <Link to={group.to} className="hover:underline">
                    {group.title} →
                  </Link>
                ) : (
                  group.title
                )}
              </h2>
              <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {group.cards.map((card) => (
                  <StatCard key={card.key} card={card} value={data.stats[card.key]} />
                ))}
              </dl>
            </section>
          ))}
      </div>
    </div>
  );
}
