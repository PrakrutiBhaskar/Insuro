import { Navigate, Outlet } from 'react-router';
import { useAppStore } from '../../store';

export function ProtectedRoute() {
  const isAuthenticated = useAppStore(state => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
