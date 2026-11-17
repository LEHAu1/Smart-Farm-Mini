import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function PublicRoute({ children }: { children: React.ReactElement }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <div className="size-8 animate-spin rounded-full border-3 border-primary/20 border-t-primary" role="status" />
      </div>
    );
  }

  if (isAuthenticated) {
    const searchParams = new URLSearchParams(location.search);
    const returnUrl = searchParams.get('returnUrl');
    const destination = returnUrl ? decodeURIComponent(returnUrl) : '/dashboard';
    return <Navigate to={destination} replace />;
  }

  return children;
}

