import { useState } from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  ChefHat,
  Truck,
  BarChart3,
  Settings,
  Package,
  LogOut,
  Menu,
  X,
  Printer,
  Bell,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Badge } from '../common/Modal';

interface PosLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  notifications?: number;
}

const menuItems = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Irányítópult' },
  { id: 'pos', icon: ShoppingCart, label: 'POS' },
  { id: 'orders', icon: ChefHat, label: 'Rendelések', badge: 'active' },
  { id: 'tables', icon: Users, label: 'Asztalok' },
  { id: 'couriers', icon: Truck, label: 'Futárok' },
  { id: 'inventory', icon: Package, label: 'Készlet' },
  { id: 'reports', icon: BarChart3, label: 'Riportok' },
  { id: 'printers', icon: Printer, label: 'Nyomtatás' },
  { id: 'settings', icon: Settings, label: 'Beállítások' },
];

export function PosLayout({ children, activeTab, onTabChange, notifications = 0 }: PosLayoutProps) {
  const { user, profile, signOut } = useAuth();
  const { tenantName, logoUrl, colors } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-[var(--color-primary)] text-white flex flex-col transition-all duration-300`}
      >
        {/* Logo */}
        <div className="p-4 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={tenantName}
                className="h-8 w-8 rounded object-cover"
              />
            ) : (
              <div className="h-8 w-8 rounded bg-white/20 flex items-center justify-center font-bold text-sm">
                {tenantName?.charAt(0) || 'S'}
              </div>
            )}
            {sidebarOpen && <span className="font-semibold">{tenantName}</span>}
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded hover:bg-white/10"
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {/* Menu */}
        <nav className="flex-1 p-3 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-white text-[var(--color-primary)]'
                    : 'hover:bg-white/10'
                }`}
              >
                <Icon size={20} />
                {sidebarOpen && (
                  <span className="font-medium">{item.label}</span>
                )}
                {sidebarOpen && item.badge && (
                  <Badge variant="warning" size="sm" className="ml-auto">
                    12
                  </Badge>
                )}
              </button>
            );
          })}
        </nav>

        {/* User */}
        <div className="p-3 border-t border-white/10">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
              {profile?.name?.charAt(0) || 'U'}
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{profile?.name || user?.email}</p>
                <p className="text-xs text-white/70">{profile?.role}</p>
              </div>
            )}
          </div>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-2 mt-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <LogOut size={20} />
            {sidebarOpen && <span>Kilépés</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {menuItems.find((m) => m.id === activeTab)?.label}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <Bell size={20} className="text-gray-600" />
              {notifications > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {notifications}
                </span>
              )}
            </button>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">
                {new Date().toLocaleDateString('hu-HU', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
              <p className="text-sm text-gray-500">
                {new Date().toLocaleTimeString('hu-HU', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 p-6 overflow-auto">{children}</div>
      </main>
    </div>
  );
}
