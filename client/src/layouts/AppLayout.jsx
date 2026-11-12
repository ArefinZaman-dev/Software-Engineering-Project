import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import Avatar from '../components/ui/Avatar.jsx';
import Brand from '../components/Brand.jsx';
import Button from '../components/ui/Button.jsx';
import useAuth from '../hooks/useAuth.js';
import { roleHome } from '../routes/paths.js';
import { ROLES } from '../utils/constants.js';

// Each role sees only the pages that exist for it. Later increments add more links here.
const NAV_ITEMS = {
  [ROLES.STUDENT]: [
    { to: '/student', label: 'Dashboard', end: true },
    { to: '/jobs', label: 'Browse jobs' },
    { to: '/student/applications', label: 'My applications' },
    { to: '/messages', label: 'Messages' },
    { to: '/student/profile', label: 'My profile' },
  ],
  [ROLES.POSTER]: [
    { to: '/poster', label: 'Dashboard', end: true },
    { to: '/poster/jobs', label: 'My jobs' },
    { to: '/messages', label: 'Messages' },
    { to: '/poster/profile', label: 'My profile' },
  ],
  [ROLES.ADMIN]: [
    { to: '/admin', label: 'Dashboard', end: true },
    { to: '/admin/users', label: 'Users' },
    { to: '/admin/jobs', label: 'Jobs' },
    { to: '/admin/reviews', label: 'Reviews' },
    { to: '/admin/reports', label: 'Reports' },
    { to: '/admin/categories', label: 'Categories' },
  ],
};

const ROLE_LABELS = { STUDENT: 'Student', POSTER: 'Poster', ADMIN: 'Admin' };

const linkClass = ({ isActive }) =>
  `whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium ${
    isActive ? 'bg-brand-600 text-white' : 'text-ink hover:bg-brand-50'
  }`;

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const items = NAV_ITEMS[user.role] || [];

  async function handleLogout() {
    await logout();
    navigate('/', { replace: true });
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Brand to={roleHome(user.role)} />
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 sm:flex">
              <Avatar name={user.name} />
              <div className="leading-tight">
                <p className="text-sm font-medium">{user.name}</p>
                <p className="text-xs text-muted">{ROLE_LABELS[user.role]}</p>
              </div>
            </div>
            <Button variant="secondary" onClick={handleLogout}>
              Log out
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 md:flex-row">
        <nav aria-label="Dashboard" className="flex gap-1 overflow-x-auto md:w-52 md:shrink-0 md:flex-col">
          {items.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={linkClass}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
