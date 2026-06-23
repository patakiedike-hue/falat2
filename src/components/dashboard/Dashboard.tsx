import { useState, useEffect } from 'react';
import type { Order } from '../../types';
import { supabase } from '../../lib/supabase';
import { useTenant } from '../../contexts/TenantContext';
import { Card, Badge, LoadingSpinner } from '../common/Modal';
import { format } from 'date-fns';
import { hu } from 'date-fns/locale';
import {
  ShoppingBag,
  DollarSign,
  TrendingUp,
  Clock,
  ChefHat,
  Truck,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';

interface DashboardStats {
  todayOrders: number;
  todayRevenue: number;
  preparingOrders: number;
  averageTime: number;
}

export function Dashboard() {
  const { tenant } = useTenant();
  const [stats, setStats] = useState<DashboardStats>({
    todayOrders: 0,
    todayRevenue: 0,
    preparingOrders: 0,
    averageTime: 0,
  });
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<string[]>([]);

  useEffect(() => {
    if (tenant) {
      loadData();

      // Subscribe to real-time updates
      const channel = supabase
        .channel(`dashboard:${tenant.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders',
            filter: `tenant_id=eq.${tenant.id}`,
          },
          () => loadData()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [tenant]);

  const loadData = async () => {
    if (!tenant) return;

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Load today's orders
      const { data: todayOrders } = await supabase
        .from('orders')
        .select('*')
        .eq('tenant_id', tenant.id)
        .gte('created_at', today.toISOString())
        .neq('status', 'cancelled');

      const totalRevenue = todayOrders?.reduce((sum, o) => sum + o.total, 0) || 0;

      // Load pending/orders being prepared
      const { data: pending } = await supabase
        .from('orders')
        .select('*, items:order_items(*)')
        .eq('tenant_id', tenant.id)
        .in('status', ['pending', 'confirmed', 'preparing'])
        .order('created_at', { ascending: true });

      // Calculate average preparation time
      const { data: completed } = await supabase
        .from('orders')
        .select('created_at, updated_at')
        .eq('tenant_id', tenant.id)
        .eq('status', 'delivered')
        .gte('created_at', today.toISOString())
        .limit(50);

      let avgTime = 0;
      if (completed && completed.length > 0) {
        const times = completed.map((o) => {
          const start = new Date(o.created_at).getTime();
          const end = new Date(o.updated_at).getTime();
          return (end - start) / 1000 / 60; // minutes
        });
        avgTime = times.reduce((sum, t) => sum + t, 0) / times.length;
      }

      setStats({
        todayOrders: todayOrders?.length || 0,
        todayRevenue: totalRevenue,
        preparingOrders: pending?.length || 0,
        averageTime: avgTime,
      });

      setPendingOrders((pending as Order[]) || []);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTimeAgo = (date: string) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return 'Épp most';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} perce`;
    const hours = Math.floor(minutes / 60);
    return `${hours} órája`;
  };

  const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    pending: { label: 'Függőben', color: 'yellow', icon: Clock },
    confirmed: { label: 'Visszaigazolva', color: 'blue', icon: CheckCircle },
    preparing: { label: 'Elkészítés', color: 'orange', icon: ChefHat },
    ready: { label: 'Kész', color: 'green', icon: CheckCircle },
    out_for_delivery: { label: 'Úton', color: 'purple', icon: Truck },
    delivered: { label: 'Kiszállítva', color: 'gray', icon: CheckCircle },
    cancelled: { label: 'Törölve', color: 'red', icon: AlertTriangle },
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100">Mai rendelések</p>
              <p className="text-4xl font-bold mt-2">{stats.todayOrders}</p>
            </div>
            <ShoppingBag size={48} className="text-blue-300" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100">Mai bevétel</p>
              <p className="text-4xl font-bold mt-2">
                {(stats.todayRevenue / 1000).toFixed(0)}K
              </p>
              <p className="text-sm text-green-200 mt-1">
                {stats.todayRevenue.toLocaleString('hu-HU')} Ft
              </p>
            </div>
            <DollarSign size={48} className="text-green-300" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100">Aktív rendelések</p>
              <p className="text-4xl font-bold mt-2">{stats.preparingOrders}</p>
            </div>
            <ChefHat size={48} className="text-orange-300" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100">Átlagos idő</p>
              <p className="text-4xl font-bold mt-2">{Math.round(stats.averageTime)}</p>
              <p className="text-sm text-purple-200 mt-1">perc</p>
            </div>
            <Clock size={48} className="text-purple-300" />
          </div>
        </Card>
      </div>

      {/* Active Orders */}
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Aktív rendelések</h3>
              <Badge variant="warning">{pendingOrders.length} db</Badge>
            </div>

            {pendingOrders.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <CheckCircle size={48} className="mx-auto mb-4 text-green-500" />
                <p>Nincs aktív rendelés</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingOrders.slice(0, 5).map((order) => {
                  const config = STATUS_CONFIG[order.status];
                  const StatusIcon = config.icon;
                  const isOld = Date.now() - new Date(order.created_at).getTime() > 15 * 60 * 1000;

                  return (
                    <div
                      key={order.id}
                      className={`flex items-center justify-between p-4 rounded-lg border ${
                        isOld ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <p className="font-bold">#{order.order_number}</p>
                          <p className="text-sm text-gray-500">
                            {getTimeAgo(order.created_at)}
                          </p>
                        </div>
                        <div>
                          <Badge
                            variant={
                              order.status === 'preparing'
                                ? 'warning'
                                : order.status === 'pending'
                                ? 'info'
                                : 'success'
                            }
                          >
                            <StatusIcon size={14} className="mr-1" />
                            {config.label}
                          </Badge>
                          <p className="text-sm text-gray-600 mt-1">
                            {order.items?.length || 0} tétel • {order.total.toLocaleString('hu-HU')} Ft
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="default">
                          {order.order_type === 'delivery'
                            ? 'Szállítás'
                            : order.order_type === 'pickup'
                            ? 'Elvitel'
                            : 'Helyben'}
                        </Badge>
                        {order.customer_name && (
                          <p className="text-sm text-gray-500 mt-1">{order.customer_name}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
                {pendingOrders.length > 5 && (
                  <p className="text-center text-sm text-gray-500">
                    +{pendingOrders.length - 5} további rendelés
                  </p>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* Quick Stats */}
        <div className="space-y-4">
          <Card>
            <h3 className="font-semibold mb-4">Gyors áttekintés</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Házhozszállítás</span>
                <span className="font-bold">
                  {pendingOrders.filter((o) => o.order_type === 'delivery').length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Elvitel</span>
                <span className="font-bold">
                  {pendingOrders.filter((o) => o.order_type === 'pickup').length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Helyben</span>
                <span className="font-bold">
                  {pendingOrders.filter((o) => o.order_type === 'dine_in').length}
                </span>
              </div>
              <div className="border-t pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 font-medium">Függőben</span>
                  <span className="font-bold text-yellow-600">
                    {pendingOrders.filter((o) => o.status === 'pending').length}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-gray-600 font-medium">Elkészítés alatt</span>
                  <span className="font-bold text-orange-600">
                    {pendingOrders.filter((o) => o.status === 'preparing').length}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-gray-600 font-medium">Kész</span>
                  <span className="font-bold text-green-600">
                    {pendingOrders.filter((o) => o.status === 'ready').length}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="font-semibold mb-4">Ma</h3>
            <div className="text-center py-4">
              <p className="text-6xl font-bold text-[var(--color-primary)]">
                {stats.todayOrders}
              </p>
              <p className="text-gray-500 mt-2">rendelés</p>
              <p className="text-2xl font-bold text-green-600 mt-4">
                {stats.todayRevenue.toLocaleString('hu-HU')} Ft
              </p>
              <p className="text-sm text-gray-500">bevétel</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
