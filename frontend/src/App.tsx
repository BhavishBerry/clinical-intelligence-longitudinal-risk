import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AlertProvider, PatientProvider } from '@/context';
import { ProtectedRoute } from '@/components/auth';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { AlertsPage } from './pages/AlertsPage';
import { PatientDetailPage } from './pages/PatientDetailPage';
import { UploadPage } from './pages/UploadPage';
import { SettingsPage } from './pages/SettingsPage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PatientProvider>
          <AlertProvider>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<LoginPage />} />

              {/* Protected Routes - All Roles */}
              <Route element={<ProtectedRoute allowedRoles={['doctor', 'nurse', 'admin']} />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/patients/:id" element={<PatientDetailPage />} />
                <Route path="/alerts" element={<AlertsPage />} />
              </Route>

              {/* Admin Only Routes */}
              <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                <Route path="/upload" element={<UploadPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>

              {/* Default Redirect */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </AlertProvider>
        </PatientProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

