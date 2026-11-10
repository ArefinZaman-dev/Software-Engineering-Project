export default function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-md bg-line/70 ${className}`} aria-hidden="true" />;
}
