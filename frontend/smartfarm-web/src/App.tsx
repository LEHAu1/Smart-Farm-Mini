import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './layouts/AppLayout'

// 12 Functional Routes Pages
import LoginPage from './pages/Login'
import RegisterPage from './pages/Register'
import DashboardPage from './pages/Dashboard'
import DevicesPage from './pages/Devices'
import AddDevicePage from './pages/AddDevice'
import DeviceDetailsPage from './pages/DeviceDetails'
import SensorHistoryPage from './pages/SensorHistory'
import IrrigationControlPage from './pages/IrrigationControl'
import IrrigationLogsPage from './pages/IrrigationLogs'
import AlertsPage from './pages/Alerts'
import CommandsPage from './pages/Commands'
import ProfilePage from './pages/Profile'
import NotFoundPage from './pages/NotFound'

export default function App() {
  return (
    <Routes>
      {/* Root redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Public Authentication Pages */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Authenticated Application Shell */}
      <Route element={<AppLayout />}>
        {/* Core Monitoring & Management */}
        <Route path="/dashboard" element={<DashboardPage />} />
        
        {/* Devices Cluster */}
        <Route path="/devices" element={<DevicesPage />} />
        <Route path="/devices/new" element={<AddDevicePage />} />
        <Route path="/devices/:deviceId" element={<DeviceDetailsPage />} />
        <Route path="/devices/:deviceId/sensors" element={<SensorHistoryPage />} />
        <Route path="/devices/:deviceId/irrigation" element={<IrrigationControlPage />} />

        {/* History, Alerts & Control Logs */}
        <Route path="/irrigation-logs" element={<IrrigationLogsPage />} />
        <Route path="/alerts" element={<AlertsPage />} />
        <Route path="/commands" element={<CommandsPage />} />

        {/* Account Profile */}
        <Route path="/profile" element={<ProfilePage />} />

        {/* Backward Compatibility Aliases */}
        <Route path="/sensors" element={<Navigate to="/devices" replace />} />
        <Route path="/irrigation" element={<Navigate to="/irrigation-logs" replace />} />
        <Route path="/history" element={<Navigate to="/irrigation-logs" replace />} />
        <Route path="/settings" element={<Navigate to="/profile" replace />} />
      </Route>

      {/* 404 Fallback */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
