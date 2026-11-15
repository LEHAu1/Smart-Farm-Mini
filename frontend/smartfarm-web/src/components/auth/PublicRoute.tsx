import { Navigate, useSearchParams } from 'react-router-dom'
import { authService } from '../../services/auth-service'

interface PublicRouteProps {
  children?: React.ReactNode
}

export function PublicRoute({ children }: PublicRouteProps) {
  const [searchParams] = useSearchParams()
  const isAuth = authService.isAuthenticated()

  if (isAuth) {
    const returnUrl = searchParams.get('returnUrl')
    const destination = returnUrl ? decodeURIComponent(returnUrl) : '/dashboard'
    return <Navigate to={destination} replace />
  }

  return children ? <>{children}</> : null
}
