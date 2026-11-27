import { AdminShell } from './components/AdminShell';
import { LoginView } from './components/LoginView';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';

function PortalRouter() {
  const { session } = useAuth();

  // Strict Super Admin access enforcement at the application root
  if (!session || session.account.isSuperAdmin !== true) {
    return <LoginView />;
  }

  return <AdminShell />;
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <PortalRouter />
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
