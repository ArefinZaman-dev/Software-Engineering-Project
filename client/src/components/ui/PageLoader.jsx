export default function PageLoader({ label = 'Loading...' }) {
  return (
    <div className="flex min-h-64 items-center justify-center gap-3 text-muted" role="status">
      <span
        className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-brand-600 border-t-transparent"
        aria-hidden="true"
      />
      <span>{label}</span>
    </div>
  );
}
