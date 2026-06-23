import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useTenant } from '../../contexts/TenantContext';
import { Button, Card, Input, Select, Badge, Table } from '../common/Modal';
import { format, startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { hu } from 'date-fns/locale';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingBag,
  Users,
  Clock,
  Download,
  Printer,
  Calendar,
  Package,
  Truck,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

type ReportRange = 'today' | 'week' | 'month' | 'custom';
type ReportType = 'sales' | 'products' | 'couriers' | 'daily';

interface SalesData {
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
  byPaymentMethod: Record<string, number>;
  byOrderType: Record<string, { count: number; revenue: number }>;
  hourlyData: Array<{ hour: number; count: number; revenue: number }>;
  dailyData: Array<{ date: string; count: number; revenue: number }>;
}

interface ProductData {
  productId: string;
  productName: string;
  count: number;
  revenue: number;
  category?: string;
}

export function ReportsModule() {
  const { tenant } = useTenant();
  const [reportRange, setReportRange] = useState<ReportRange>('today');
  const [reportType, setReportType] = useState<ReportType>('sales');
  const [customStart, setCustomStart] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [customEnd, setCustomEnd] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isLoading, setIsLoading] = useState(true);
  const [salesData, setSalesData] = useState<SalesData | null>(null);
  const [topProducts, setTopProducts] = useState<ProductData[]>([]);

  useEffect(() => {
    if (tenant) {
      loadReportData();
    }
  }, [tenant, reportRange, customStart, customEnd]);

  const getDateRange = () => {
    const now = new Date();
    switch (reportRange) {
      case 'today':
        return { start: startOfDay(now), end: endOfDay(now) };
      case 'week':
        return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
      case 'month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'custom':
        return {
          start: new Date(customStart + 'T00:00:00'),
          end: new Date(customEnd + 'T23:59:59'),
        };
    }
  };

  const loadReportData = async () => {
    if (!tenant) return;

    setIsLoading(true);
    const range = getDateRange();

    try {
      // Load orders
      const { data: orders, error } = await supabase
        .from('orders')
        .select('*, items:order_items(*)')
        .eq('tenant_id', tenant.id)
        .gte('created_at', range.start.toISOString())
        .lte('created_at', range.end.toISOString())
        .neq('status', 'cancelled')
        .order('created_at');

      if (error) throw error;

      // Process sales data
      const totalOrders = orders?.length || 0;
      const totalRevenue = orders?.reduce((sum, o) => sum + o.total, 0) || 0;
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      const byPaymentMethod: Record<string, number> = {};
      const byOrderType: Record<string, { count: number; revenue: number }> = {
        delivery: { count: 0, revenue: 0 },
        pickup: { count: 0, revenue: 0 },
        dine_in: { count: 0, revenue: 0 },
      };

      orders?.forEach((order) => {
        // Payment method
        const method = order.payment_method || 'unknown';
        byPaymentMethod[method] = (byPaymentMethod[method] || 0) + order.total;

        // Order type
        if (byOrderType[order.order_type]) {
          byOrderType[order.order_type].count++;
          byOrderType[order.order_type].revenue += order.total;
        }
      });

      // Hourly breakdown
      const hourlyMap = new Map<number, { count: number; revenue: number }>();
      orders?.forEach((order) => {
        const hour = new Date(order.created_at).getHours();
        const current = hourlyMap.get(hour) || { count: 0, revenue: 0 };
        hourlyMap.set(hour, {
          count: current.count + 1,
          revenue: current.revenue + order.total,
        });
      });

      const hourlyData = Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        count: hourlyMap.get(i)?.count || 0,
        revenue: hourlyMap.get(i)?.revenue || 0,
      }));

      // Daily breakdown
      const dailyMap = new Map<string, { count: number; revenue: number }>();
      orders?.forEach((order) => {
        const date = format(new Date(order.created_at), 'yyyy-MM-dd');
        const current = dailyMap.get(date) || { count: 0, revenue: 0 };
        dailyMap.set(date, {
          count: current.count + 1,
          revenue: current.revenue + order.total,
        });
      });

      const dailyData = Array.from(dailyMap.entries())
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date));

      setSalesData({
        totalOrders,
        totalRevenue,
        avgOrderValue,
        byPaymentMethod,
        byOrderType,
        hourlyData,
        dailyData,
      });

      // Process product data
      const productMap = new Map<string, ProductData>();
      orders?.forEach((order) => {
        order.items?.forEach((item: any) => {
          const current = productMap.get(item.product_id) || {
            productId: item.product_id,
            productName: item.product_name,
            count: 0,
            revenue: 0,
          };
          productMap.set(item.product_id, {
            ...current,
            count: current.count + item.quantity,
            revenue: item.quantity * item.product_price,
          });
        });
      });

      setTopProducts(
        Array.from(productMap.values())
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)
      );
    } catch (error) {
      console.error('Failed to load report data:', error);
      toast.error('Nem sikerült betölteni az adatokat');
    } finally {
      setIsLoading(false);
    }
  };

  const exportReport = () => {
    const csv = generateCSV();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `riport-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  const generateCSV = () => {
    let csv = 'Riasztás;Előállítás\n';
    csv += `Időszak;${reportRange === 'today' ? 'Ma' : reportRange === 'week' ? 'Heti' : reportRange === 'month' ? 'Havi' : 'Egyedi'}\n`;
    csv += `Rendelések száma;${salesData?.totalOrders || 0}\n`;
    csv += `Teljes bevétel;${salesData?.totalRevenue || 0} Ft\n`;
    csv += `Átlag rendelés;${Math.round(salesData?.avgOrderValue || 0)} Ft\n\n`;

    csv += 'Rendelések típus szerint:\n';
    Object.entries(salesData?.byOrderType || {}).forEach(([type, data]) => {
      csv += `${type};${data.count};${data.revenue} Ft\n`;
    });

    return csv;
  };

  const printReport = (type: 'daily' | 'courier') => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Riportok és statisztikák</h2>
          <p className="text-gray-500 mt-1">Elemezze az értékesítési adatokat</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportReport}>
            <Download size={16} className="mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => printReport('daily')}>
            <Printer size={16} className="mr-2" />
            Nyomtatás
          </Button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-4">
        <Select
          value={reportRange}
          onChange={(e) => setReportRange(e.target.value as ReportRange)}
          options={[
            { value: 'today', label: 'Ma' },
            { value: 'week', label: 'Heti' },
            { value: 'month', label: 'Havi' },
            { value: 'custom', label: 'Egyedi tartomány' },
          ]}
        />
        {reportRange === 'custom' && (
          <>
            <Input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
            />
            <Input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
            />
          </>
        )}
        <Button onClick={loadReportData}>
          Frissítés
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-[var(--color-primary)] bg-opacity-10 flex items-center justify-center">
              <ShoppingBag size={24} className="text-[var(--color-primary)]" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Rendelések</p>
              <p className="text-2xl font-bold">{salesData?.totalOrders || 0}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
              <DollarSign size={24} className="text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Bevétel</p>
              <p className="text-2xl font-bold">{(salesData?.totalRevenue || 0).toLocaleString('hu-HU')} Ft</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-yellow-100 flex items-center justify-center">
              <TrendingUp size={24} className="text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Átlag rendelés</p>
              <p className="text-2xl font-bold">{Math.round(salesData?.avgOrderValue || 0).toLocaleString('hu-HU')} Ft</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
              <Users size={24} className="text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Vásárlók</p>
              <p className="text-2xl font-bold">{salesData?.totalOrders || 0}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Order Type Breakdown */}
        <Card>
          <h3 className="font-semibold mb-4">Rendelések típus szerint</h3>
          <div className="space-y-4">
            {Object.entries(salesData?.byOrderType || {}).map(([type, data]) => {
              const labels: Record<string, string> = {
                delivery: 'Szállítás',
                pickup: 'Elvitel',
                dine_in: 'Helyben',
              };
              const percentages = salesData?.totalOrders
                ? Math.round((data.count / salesData.totalOrders) * 100)
                : 0;
              return (
                <div key={type}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{labels[type]}</span>
                    <span className="text-sm text-gray-500">
                      {data.count} ({percentages}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="h-3 rounded-full bg-[var(--color-primary)]"
                      style={{ width: `${percentages}%` }}
                    />
                  </div>
                  <p className="text-sm text-right mt-1 font-medium">
                    {data.revenue.toLocaleString('hu-HU')} Ft
                  </p>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Payment Method Breakdown */}
        <Card>
          <h3 className="font-semibold mb-4">Fizetési mód</h3>
          <div className="space-y-3">
            {Object.entries(salesData?.byPaymentMethod || {}).map(([method, amount]) => {
              const labels: Record<string, string> = {
                cash: 'Készpénz',
                card: 'Bankkártya',
                online: 'Online',
                unknown: 'Ismeretlen',
              };
              const percent = salesData?.totalRevenue
                ? Math.round((amount / salesData.totalRevenue) * 100)
                : 0;
              return (
                <div key={method} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-[var(--color-primary)]" />
                    <span>{labels[method]}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant="default">{percent}%</Badge>
                    <span className="font-medium w-32 text-right">
                      {amount.toLocaleString('hu-HU')} Ft
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Top Products */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Legnépszerűbb termékek</h3>
          <Badge variant="info">{topProducts.length} termék</Badge>
        </div>
        {topProducts.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Nincsenek adatok</p>
        ) : (
          <Table
            data={topProducts}
            columns={[
              {
                key: 'rank',
                header: '#',
                render: (_, idx) => <span className="font-bold">{idx + 1}</span>,
              },
              {
                key: 'productName',
                header: 'Termék',
              },
              {
                key: 'count',
                header: 'Darabszám',
                render: (item) => <Badge variant="info">{item.count} db</Badge>,
              },
              {
                key: 'revenue',
                header: 'Bevétel',
                render: (item) => (
                  <span className="font-medium">{item.revenue.toLocaleString('hu-HU')} Ft</span>
                ),
                className: 'text-right',
              },
            ]}
          />
        )}
      </Card>

      {/* Hourly Chart */}
      <Card>
        <h3 className="font-semibold mb-4">Óránkénti eloszlás</h3>
        <div className="flex gap-2">
          {salesData?.hourlyData?.map((h) => {
            const maxCount = Math.max(...(salesData?.hourlyData?.map((x) => x.count) || [1]));
            const height = maxCount > 0 ? (h.count / maxCount) * 100 : 0;
            return (
              <div key={h.hour} className="flex-1 flex flex-col items-center">
                <div
                  className="w-full bg-[var(--color-primary)] rounded-t transition-all"
                  style={{ height: `${Math.max(height, 4)}%`, minHeight: '4px' }}
                />
                <span className="text-xs text-gray-500 mt-1">{h.hour}</span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
