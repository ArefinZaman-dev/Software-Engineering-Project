export default function RatingSummary({ summary }) {
  if (!summary || summary.count === 0) {
    return <p className="text-sm text-muted">No reviews yet.</p>;
  }
  const label = summary.count === 1 ? 'review' : 'reviews';
  return (
    <p className="text-sm">
      <span className="font-display text-xl font-bold">{summary.average.toFixed(1)}</span>
      <span className="text-muted"> out of 5 from {summary.count} {label}</span>
    </p>
  );
}
