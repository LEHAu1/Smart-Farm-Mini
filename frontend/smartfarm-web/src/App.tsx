import { Navigate, Route, Routes } from 'react-router-dom'
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

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/devices" element={<DevicesPage />} />
        <Route path="/sensors" element={<SensorsPage />} />
        <Route path="/irrigation" element={<IrrigationPage />} />
        <Route path="/alerts" element={<AlertsPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
