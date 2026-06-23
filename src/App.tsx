import { useEffect, useState } from 'react';
import { BrowserRouter, useNavigate, useSearchParams } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { TenantProvider, useTenant } from './contexts/TenantContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';

import { LoadingSpinner } from './components/common/Modal';
import { PosLayout } from './components/layout/PosLayout';
import { PlatformAdminPanel } from './components/admin/PlatformAdminPanel';
import { DiscoveryPage } from './pages/DiscoveryPage';
import { Dashboard } from './components/dashboard/Dashboard';
import { PosTerminal } from './components/pos/PosTerminal';
import { OrderManagement } from './components/orders/OrderManagement';
import { TableManagement } from './components/pos/TableManagement';
import { CourierManagement } from './components/couriers/CourierManagement';
import { InventoryManagement } from './components/inventory/InventoryManagement';
import { ReportsModule } from './components/reports/ReportsModule';
import { SettingsModule } from './components/settings/SettingsModule';

function AppContent() {
  const { tenant, isLoading, isAdmin } = useTenant();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const forceAdmin = searchParams.get('admin') === 'true';
  const forcePos   = searchParams.get('pos')   === 'true';

  useEffect(() => {
    const tab = searchParams.get('tab') || 'dashboard';
    setActiveTab(tab);
  }, [searchParams]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    navigate(`?pos=true&tab=${tab}`);
  };

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Platform admin panel
  if ((isAdmin && !tenant) || (forceAdmin && isDevelopment)) {
    return <PlatformAdminPanel />;
  }

  // Discovery page: root on localhost without ?pos=true
  if (isDevelopment && !forcePos && !forceAdmin) {
    return <DiscoveryPage />;
  }

  // POS: require auth
  const demoMode = isDevelopment && !isAuthenticated;
  if (!isAuthenticated && !isAdmin && !demoMode) {
    return <LoginPage />;
  }

  if (!tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Étterem nem található</h1>
          <p className="text-gray-600">A kért étterem nem létezik vagy nem aktív.</p>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <PosLayout activeTab={activeTab} onTabChange={handleTabChange} notifications={0}>
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'pos' && <PosTerminal />}
        {activeTab === 'orders' && <OrderManagement />}
        {activeTab === 'tables' && (
          <TableManagement
            onSelectTable={(tableId) => {
              setActiveTab('pos');
              navigate(`?pos=true&tab=pos&tableId=${tableId}`);
            }}
          />
        )}
        {activeTab === 'couriers' && <CourierManagement />}
        {activeTab === 'inventory' && <InventoryManagement />}
        {activeTab === 'reports' && <ReportsModule />}
        {activeTab === 'printers' && (
          <div className="text-center py-12">
            <h2 className="text-xl font-bold">Nyomtatók kezelése</h2>
            <p className="text-gray-500 mt-2">Konfigurálja a nyomtatókat itt.</p>
          </div>
        )}
        {activeTab === 'settings' && <SettingsModule />}
      </PosLayout>
    </ThemeProvider>
  );
}

function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const { error } = await signIn(email, password);

    if (error) {
      setError(error.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Bejelentkezés</h1>
            <p className="text-gray-600 mt-2">POS rendszer</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="pelda@email.hu"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Jelszó
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[var(--color-primary)] text-white py-3 rounded-lg font-medium hover:opacity-90 disabled:opacity-50 transition-colors"
            >
              {isLoading ? 'Betöltés...' : 'Bejelentkezés'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <TenantProvider>
        <AuthProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
            }}
          />
          <AppContent />
        </AuthProvider>
      </TenantProvider>
    </BrowserRouter>
  );
}

export default App;
