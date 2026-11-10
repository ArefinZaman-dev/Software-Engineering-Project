import { Link } from 'react-router-dom';
import { buttonClasses } from '../components/ui/Button.jsx';

export default function NotFoundPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <h1 className="font-display text-3xl font-bold">Page not found</h1>
      <p className="mt-2 text-muted">The page you are looking for does not exist or has moved.</p>
      <Link to="/" className={buttonClasses({ className: 'mt-6' })}>
        Back to the home page
      </Link>
    </div>
  );
}
