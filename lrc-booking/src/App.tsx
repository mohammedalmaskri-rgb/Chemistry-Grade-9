import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';
import type { Role } from './types';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { AppShell } from './components/AppShell';
import LoginPage from './pages/LoginPage';
import TeacherHome from './pages/TeacherHome';
import MyBookings from './pages/MyBookings';
import AdminPage from './pages/admin/AdminPage';
import StatsPage from './pages/StatsPage';

/** حماية الصفحات حسب الدور (في مرحلة الربط تُفرض الصلاحيات أيضاً في الخادم) */
function Protected({ children, roles }: { children: ReactNode; roles?: Role[] }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="grid min-h-screen place-items-center text-navy-400">جارٍ التحميل…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <AppShell>{children}</AppShell>;
}

function LoginRoute() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/" replace /> : <LoginPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <HashRouter>
          <Routes>
            <Route path="/login" element={<LoginRoute />} />
            <Route path="/" element={<Protected><TeacherHome /></Protected>} />
            <Route path="/my-bookings" element={<Protected><MyBookings /></Protected>} />
            <Route path="/admin" element={<Navigate to="/admin/requests" replace />} />
            <Route path="/admin/:tab" element={<Protected roles={['lrc_admin', 'management']}><AdminPage /></Protected>} />
            <Route path="/stats" element={<Protected roles={['management']}><StatsPage /></Protected>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </HashRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
