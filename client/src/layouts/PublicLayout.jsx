import { Link, NavLink, Outlet } from 'react-router-dom';
import Brand from '../components/Brand.jsx';
import { buttonClasses } from '../components/ui/Button.jsx';
import useAuth from '../hooks/useAuth.js';
import { roleHome } from '../routes/paths.js';

const navLinkClass = ({ isActive }) =>
  `rounded-md px-3 py-2 text-sm font-medium hover:bg-brand-50 ${isActive ? 'text-brand-700' : 'text-ink'}`;

export default function PublicLayout() {
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Brand />
          <nav aria-label="Main" className="flex flex-wrap items-center gap-1">
            <NavLink to="/jobs" className={navLinkClass}>
              Browse jobs
            </NavLink>
            <NavLink to="/about" className={navLinkClass}>
              How it works
            </NavLink>
            {user ? (
              <Link to={roleHome(user.role)} className={buttonClasses({ className: 'ml-2' })}>
                Go to dashboard
              </Link>
            ) : (
              <>
                <NavLink to="/login" className={navLinkClass}>
                  Log in
                </NavLink>
                <Link to="/register" className={buttonClasses({ className: 'ml-2' })}>
                  Sign up
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-line bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-muted">
          <p className="font-medium text-ink">Connecting Students with Trusted Flexible Work.</p>
          <p className="mt-1">Version 1, built by team CodeConnect for the BUBT Software Engineering Lab.</p>
        </div>
      </footer>
    </div>
  );
}
