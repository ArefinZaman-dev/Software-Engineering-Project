import { Link } from 'react-router-dom';

export default function Brand({ to = '/' }) {
  return (
    <Link to={to} className="inline-flex items-center gap-2 font-display text-xl font-bold">
      <span aria-hidden="true" className="inline-block h-6 w-6 rounded-md bg-brand-600 p-1">
        <span className="block h-full w-full rounded-sm bg-mark" />
      </span>
      CampusGig
    </Link>
  );
}
