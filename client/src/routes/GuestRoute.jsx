import { Navigate, Outlet } from 'react-router-dom';
import useAuth from '../hooks/useAuth.js';
import PageLoader from '../components/ui/PageLoader.jsx';
import { roleHome } from './paths.js';

// Login and register pages are only for people who are not logged in yet.
export default function GuestRoute() {
  const { user, status } = useAuth();

  if (status === 'loading') return <PageLoader label="Checking your session..." />;
  if (user) return <Navigate to={roleHome(user.role)} replace />;
  return <Outlet />;
}
