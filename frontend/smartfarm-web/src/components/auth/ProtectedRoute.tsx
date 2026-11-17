import { Navigate, useLocation } from 'react-router-dom'
import { authService } from '../../services/auth-service'

interface ProtectedRouteProps {
  children?: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation()
  const isAuth = authService.isAuthenticated()

  if (!isAuth) {
    const returnUrl = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?returnUrl=${returnUrl}`} replace />
  }

  return children ? <>{children}</> : null
}
