import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';

// Layouts & Route Guards
import AppLayout from './layouts/AppLayout';
import ProtectedRoute from './components/routing/ProtectedRoute';
import PublicRoute from './components/routing/PublicRoute';

// Pages
import LoginPage from './pages/Login';
import RegisterPage from './pages/Register';
import VerifyEmailPage from './pages/VerifyEmail';
import ForgotPasswordPage from './pages/ForgotPassword';
import ResetPasswordPage from './pages/ResetPassword';
import DashboardPage from './pages/Dashboard';
import DevicesPage from './pages/Devices';
import DeviceDetailPlaceholder from './pages/Devices/DeviceDetailPlaceholder';
import SensorsPage from './pages/Sensors';
import IrrigationPage from './pages/Irrigation';
import HistoryPage from './pages/History';
import AlertsPage from './pages/Alerts';
import CommandsPage from './pages/Commands';
import ProfilePage from './pages/Profile';
import SettingsPage from './pages/Settings';
import NotFoundPage from './pages/NotFound';

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <ToastProvider>
            <Routes>
          {/* Root redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Public Auth Routes */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicRoute>
                <RegisterPage />
              </PublicRoute>
            }
          />
          <Route
            path="/verify-email"
            element={
              <PublicRoute>
                <VerifyEmailPage />
              </PublicRoute>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <PublicRoute>
                <ForgotPasswordPage />
              </PublicRoute>
            }
          />
          <Route
            path="/reset-password"
            element={
              <PublicRoute>
                <ResetPasswordPage />
              </PublicRoute>
            }
          />

          {/* Protected Main App Shell Routes */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            
            {/* Devices & Device-scoped routes */}
            <Route path="/devices" element={<DevicesPage />} />
            <Route path="/devices/:deviceId" element={<DeviceDetailPlaceholder />} />
            <Route path="/devices/:deviceId/sensors" element={<DeviceDetailPlaceholder />} />
            <Route path="/devices/:deviceId/irrigation" element={<DeviceDetailPlaceholder />} />

            {/* Global telemetry & management views */}
            <Route path="/sensors" element={<SensorsPage />} />
            <Route path="/irrigation" element={<IrrigationPage />} />
            <Route path="/irrigation-history" element={<HistoryPage />} />
            <Route path="/history" element={<Navigate to="/irrigation-history" replace />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/commands" element={<CommandsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          {/* 404 Catch-all */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
          </ToastProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
