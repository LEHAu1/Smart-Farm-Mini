import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import AppLayout from './layouts/AppLayout'
import DashboardPage from './pages/Dashboard'
import LoginPage from './pages/Login'
import NotFoundPage from './pages/NotFound'
import DevicesPage from './pages/Devices'
import SensorsPage from './pages/Sensors'
import IrrigationPage from './pages/Irrigation'
import AlertsPage from './pages/Alerts'
import HistoryPage from './pages/History'
import SettingsPage from './pages/Settings'
import { AuthProvider, useAuth } from './hooks/AuthContext'

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<LoginRoute />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/devices" element={<DevicesPage />} />
          <Route path="/sensors" element={<SensorsPage />} />
          <Route path="/irrigation" element={<IrrigationPage />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

function RequireAuth() {
  const { status } = useAuth()
  const location = useLocation()
  if (status === 'loading') return <AuthLoading />
  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  return <Outlet />
}

function LoginRoute() {
  const { status } = useAuth()
  const location = useLocation()
  if (status === 'loading') return <AuthLoading />
  if (status === 'authenticated') {
    const returnTo = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname
    return <Navigate to={returnTo || '/dashboard'} replace />
  }
  return <LoginPage />
}

function AuthLoading() {
  return <main className="flex min-h-screen items-center justify-center p-6 text-sm text-muted" role="status">Đang kiểm tra phiên đăng nhập…</main>
}
