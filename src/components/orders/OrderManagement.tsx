import { useState, useEffect, useRef } from 'react';
import type { Order, OrderStatus } from '../../types';
import { supabase } from '../../lib/supabase';
import { useTenant } from '../../contexts/TenantContext';
import { Button, Card, Modal, Input, Select, Badge, Table, EmptyState } from '../common/Modal';
import { format } from 'date-fns';
import { hu } from 'date-fns/locale';
import {
  Search,
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  ChefHat,
  MoreVertical,
  Printer,
  User,
  MapPin,
  Phone,
  MessageSquare,
  Timer,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const STATUS_CONFIG: Record<
  OrderStatus,
  { color: string; bgColor: string; label: string; icon: React.ElementType }
> = {
  pending: { color: 'text-yellow-700', bgColor: 'bg-yellow-100', label: 'Függőben', icon: Clock },
  confirmed: { color: 'text-blue-700', bgColor: 'bg-blue-100', label: 'Visszaigazolva', icon: CheckCircle },
  preparing: { color: 'text-orange-700', bgColor: 'bg-orange-100', label: 'Elkészítés alatt', icon: ChefHat },
  ready: { color: 'text-green-700', bgColor: 'bg-green-100', label: 'Kész', icon: CheckCircle },
  out_for_delivery: { color: 'text-purple-700', bgColor: 'bg-purple-100', label: 'Úton', icon: Truck },
  delivered: { color: 'text-gray-700', bgColor: 'bg-gray-100', label: 'Kiszállítva', icon: CheckCircle },
  cancelled: { color: 'text-red-700', bgColor: 'bg-red-100', label: 'Törölve', icon: XCircle },
  refunded: { color: 'text-red-700', bgColor: 'bg-red-100', label: 'Visszatérítve', icon: RefreshCw },
};

const ORDER_TYPE_LABELS: Record<string, string> = {
  delivery: 'Házhozszállítás',
  pickup: 'Elvitel',
  dine_in: 'Helyben fogyasztás',
};

interface OrderManagementProps {
  view?: 'all' | 'kitchen' | 'courier';
  limit?: number;
}

export function OrderManagement({ view = 'all', limit }: OrderManagementProps) {
  const { tenant } = useTenant();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  const channelsRef = useRef<RealtimeChannel | null>(null);

  const loadOrders = async () => {
    if (!tenant) return;

    setIsLoading(true);
    try {
      let query = supabase
        .from('orders')
        .select('*, items:order_items(*), table:restaurant_tables(*)')
        .eq('tenant_id', tenant.id)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      setOrders(data as Order[]);
    } catch (error) {
      console.error('Failed to load orders:', error);
      toast.error('Nem sikerült betölteni a rendeléseket');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [tenant, statusFilter, limit]);

  useEffect(() => {
    if (!tenant) return;

    const channel = supabase
      .channel(`orders:${tenant.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `tenant_id=eq.${tenant.id}`,
        },
        () => {
          loadOrders();
        }
      )
      .subscribe();

    channelsRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenant]);

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId);

      if (error) throw error;
      toast.success('Státusz frissítve');
      loadOrders();
    } catch (error) {
      console.error('Failed to update order status:', error);
      toast.error('Nem sikerült frissíteni a státuszt');
    }
  };

  const printKitchenTicket = async (order: Order) => {
    try {
      const { error } = await supabase.from('print_jobs').insert({
        tenant_id: tenant?.id,
        order_id: order.id,
        job_type: 'kitchen',
        content: JSON.stringify({
          order_number: order.order_number,
          items: order.items,
          notes: order.notes,
          created_at: order.created_at,
        }),
        status: 'pending',
      });

      if (error) throw error;
      toast.success('Konyha blokk nyomtatása kezdeményezve');
    } catch (error) {
      console.error('Failed to print:', error);
      toast.error('Nem sikerült nyomtatni');
    }
  };

  const filteredOrders = orders.filter((order) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      order.order_number.toLowerCase().includes(query) ||
      order.customer_name?.toLowerCase().includes(query) ||
      order.customer_phone?.includes(query)
    );
  });

  const getTimeAgo = (date: string) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return 'Épp most';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} perce`;
    const hours = Math.floor(minutes / 60);
    return `${hours} órája`;
  };

  const isUrgent = (order: Order) => {
    if (order.status === 'cancelled' || order.status === 'delivered') return false;
    const minutes = Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000);
    return minutes > 15;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)]" />
      </div>
    );
  }

  // Kitchen view - show preparing orders
  if (view === 'kitchen') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Konyha nézet</h2>
          <Button variant="outline" onClick={loadOrders}>
            <RefreshCw size={18} className="mr-2" />
            Frissítés
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders
            .filter((o) => o.status === 'pending' || o.status === 'confirmed' || o.status === 'preparing')
            .map((order) => {
              const config = STATUS_CONFIG[order.status];
              const StatusIcon = config.icon;

              return (
                <Card
                  key={order.id}
                  className={`${
                    isUrgent(order) ? 'ring-2 ring-red-500' : ''
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-lg font-bold text-gray-900">#{order.order_number}</p>
                        <p className="text-sm text-gray-500">
                          {format(new Date(order.created_at), 'HH:mm', { locale: hu })}
                        </p>
                      </div>
                      <Badge variant={order.status === 'preparing' ? 'warning' : order.status === 'pending' ? 'info' : 'success'}>
                        {config.label}
                      </Badge>
                    </div>

                    {isUrgent(order) && (
                      <div className="flex items-center gap-2 p-2 bg-red-50 text-red-700 rounded text-sm">
                        <Timer size={16} className="animate-pulse" />
                        <span>{getTimeAgo(order.created_at)} - Sürgős!</span>
                      </div>
                    )}

                    <div className="space-y-2">
                      {order.items?.map((item, idx) => (
                        <div key={idx} className="flex items-start justify-between">
                          <div>
                            <span className="font-medium">{item.quantity}x</span>
                            <span className="ml-2">{item.product_name}</span>
                            {item.notes && (
                              <p className="text-xs text-gray-500 italic">{item.notes}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {order.notes && (
                      <div className="p-2 bg-yellow-50 text-yellow-800 rounded text-sm">
                        <strong>Megjegyzés:</strong> {order.notes}
                      </div>
                    )}

                    <div className="flex gap-2 pt-2 border-t">
                      <Button
                        className="flex-1"
                        size="sm"
                        variant={order.status === 'preparing' ? 'outline' : 'primary'}
                        onClick={() =>
                          updateOrderStatus(
                            order.id,
                            order.status === 'preparing' ? 'ready' : 'preparing'
                          )
                        }
                      >
                        <ChefHat size={16} className="mr-2" />
                        {order.status === 'preparing' ? 'Kész!' : 'Elkészítés'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => printKitchenTicket(order)}
                      >
                        <Printer size={16} />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-64">
          <Input
            placeholder="Keresés rendelésszám, név vagy telefon alapján..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search size={18} />}
          />
        </div>

        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={[
            { value: 'all', label: 'Összes státusz' },
            { value: 'pending', label: 'Függőben' },
            { value: 'confirmed', label: 'Visszaigazolva' },
            { value: 'preparing', label: 'Elkészítés alatt' },
            { value: 'ready', label: 'Kész' },
            { value: 'out_for_delivery', label: 'Úton' },
            { value: 'delivered', label: 'Kiszállítva' },
            { value: 'cancelled', label: 'Törölve' },
          ]}
        />
      </div>

      {/* Orders Grid */}
      {filteredOrders.length === 0 ? (
        <EmptyState
          title="Nincsenek rendelések"
          description="A rendelések itt fognak megjelenni"
        />
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => {
            const config = STATUS_CONFIG[order.status];
            const StatusIcon = config.icon;

            return (
              <Card
                key={order.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => {
                  setSelectedOrder(order);
                  setShowUpdateModal(true);
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-lg font-bold text-gray-900">#{order.order_number}</p>
                      <p className="text-sm text-gray-500">
                        {format(new Date(order.created_at), 'HH:mm')}
                      </p>
                    </div>

                    <div className="w-px h-12 bg-gray-200" />

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="default" size="sm">
                          {ORDER_TYPE_LABELS[order.order_type]}
                        </Badge>
                        {order.table && (
                          <Badge variant="info" size="sm">
                            {order.table.table_number}. asztal
                          </Badge>
                        )}
                      </div>
                      {order.customer_name && (
                        <p className="text-sm text-gray-600">{order.customer_name}</p>
                      )}
                      {order.order_type === 'delivery' && order.delivery_address && (
                        <p className="text-sm text-gray-500 truncate max-w-xs">
                          <MapPin size={14} className="inline mr-1" />
                          {order.delivery_address}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-xl font-bold text-gray-900">
                        {order.total.toLocaleString('hu-HU')} Ft
                      </p>
                      <p className="text-sm text-gray-500">
                        {order.items?.length || 0} tétel
                      </p>
                    </div>

                    <Badge
                      variant={
                        order.status === 'delivered' || order.status === 'ready'
                          ? 'success'
                          : order.status === 'cancelled'
                          ? 'error'
                          : order.status === 'preparing'
                          ? 'warning'
                          : 'info'
                      }
                    >
                      <StatusIcon size={14} className="mr-1" />
                      {config.label}
                    </Badge>

                    <span className="text-sm text-gray-500">{getTimeAgo(order.created_at)}</span>
                  </div>
                </div>

                {isUrgent(order) && (
                  <div className="mt-3 pt-3 border-t flex items-center gap-2 text-sm text-red-600">
                    <Timer size={16} className="animate-pulse" />
                    <span>Sürgős - {getTimeAgo(order.created_at)}!</span>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Order Detail Modal */}
      <Modal
        isOpen={showUpdateModal}
        onClose={() => {
          setShowUpdateModal(false);
          setSelectedOrder(null);
        }}
        title={`Rendelés #${selectedOrder?.order_number || ''}`}
        size="xl"
      >
        {selectedOrder && (
          <OrderDetail
            order={selectedOrder}
            onClose={() => {
              setShowUpdateModal(false);
              setSelectedOrder(null);
            }}
            onStatusUpdate={(status) => {
              updateOrderStatus(selectedOrder.id, status);
              setShowUpdateModal(false);
              setSelectedOrder(null);
            }}
          />
        )}
      </Modal>
    </div>
  );
}

interface OrderDetailProps {
  order: Order;
  onClose: () => void;
  onStatusUpdate: (status: OrderStatus) => void;
}

function OrderDetail({ order, onClose, onStatusUpdate }: OrderDetailProps) {
  const { tenant } = useTenant();
  const [couriers, setCouriers] = useState<any[]>([]);
  const [selectedCourier, setSelectedCourier] = useState<string | null>(order.courier_id);

  useEffect(() => {
    loadCouriers();
  }, []);

  const loadCouriers = async () => {
    if (!tenant) return;
    const { data } = await supabase
      .from('couriers')
      .select('*')
      .eq('tenant_id', tenant.id)
      .eq('is_active', true)
      .order('name');
    if (data) setCouriers(data);
  };

  const assignCourier = async () => {
    if (!selectedCourier) return;

    const { error } = await supabase
      .from('orders')
      .update({ courier_id: selectedCourier, status: 'out_for_delivery' })
      .eq('id', order.id);

    if (!error) {
      toast.success('Futár hozzárendelve');
      onClose();
    }
  };

  const config = STATUS_CONFIG[order.status];

  return (
    <div className="space-y-6">
      {/* Status & Actions */}
      <div className="flex items-center justify-between pb-4 border-b">
        <div className=" flex items-center gap-4">
          <Badge
            variant={
              order.status === 'delivered'
                ? 'success'
                : order.status === 'cancelled'
                ? 'error'
                : 'info'
            }
          >
            {config.label}
          </Badge>
          <span className="text-sm text-gray-500">
            {format(new Date(order.created_at), 'yyyy.MM.dd HH:mm', { locale: hu })}
          </span>
        </div>

        <div className="flex gap-2">
          {order.status === 'pending' && (
            <>
              <Button
                size="sm"
                variant="primary"
                onClick={() => onStatusUpdate('preparing')}
              >
                <ChefHat size={16} className="mr-2" />
                Elkészítés
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => onStatusUpdate('cancelled')}
              >
                <XCircle size={16} className="mr-2" />
                Törlés
              </Button>
            </>
          )}
          {order.status === 'preparing' && (
            <Button size="sm" variant="success" onClick={() => onStatusUpdate('ready')}>
              <CheckCircle size={16} className="mr-2" />
              Kész
            </Button>
          )}
          {order.status === 'ready' && order.order_type === 'delivery' && (
            <Button size="sm" variant="primary" onClick={() => onStatusUpdate('out_for_delivery')}>
              <Truck size={16} className="mr-2" />
              Átadás futárnak
            </Button>
          )}
          {order.status === 'out_for_delivery' && (
            <Button size="sm" variant="success" onClick={() => onStatusUpdate('delivered')}>
              <CheckCircle size={16} className="mr-2" />
              Kiszállítva
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Customer Info */}
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900">Vevő adatai</h3>
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            {order.customer_name && (
              <div className="flex items-center gap-2">
                <User size={16} className="text-gray-500" />
                <span>{order.customer_name}</span>
              </div>
            )}
            {order.customer_phone && (
              <div className="flex items-center gap-2">
                <Phone size={16} className="text-gray-500" />
                <span>{order.customer_phone}</span>
              </div>
            )}
            {order.delivery_address && (
              <div className="flex items-start gap-2">
                <MapPin size={16} className="text-gray-500 mt-1" />
                <div>
                  <p>{order.delivery_address}</p>
                  {order.delivery_city && (
                    <p className="text-sm text-gray-500">{order.delivery_postal_code} {order.delivery_city}</p>
                  )}
                </div>
              </div>
            )}
            {order.notes && (
              <div className="flex items-start gap-2">
                <MessageSquare size={16} className="text-gray-500 mt-1" />
                <p className="text-sm">{order.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Order Items */}
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900">Tételek</h3>
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            {order.items?.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div>
                  <span className="font-medium">{item.quantity}x</span>
                  <span className="ml-2">{item.product_name}</span>
                  {item.variant_name && (
                    <span className="text-sm text-gray-500 ml-1">({item.variant_name})</span>
                  )}
                  {item.notes && (
                    <p className="text-xs text-gray-500 italic">{item.notes}</p>
                  )}
                </div>
                <span className="font-medium">
                  {item.subtotal.toLocaleString('hu-HU')} Ft
                </span>
              </div>
            ))}

            <div className="border-t pt-2 mt-2 space-y-1">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Részösszeg</span>
                <span>{order.subtotal.toLocaleString('hu-HU')} Ft</span>
              </div>
              {order.delivery_fee > 0 && (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Szállítási díj</span>
                  <span>{order.delivery_fee.toLocaleString('hu-HU')} Ft</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg">
                <span>Összesen</span>
                <span className="text-[var(--color-primary)]">
                  {order.total.toLocaleString('hu-HU')} Ft
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Courier Assignment */}
      {order.order_type === 'delivery' && order.status !== 'delivered' && order.status !== 'cancelled' && (
        <div className="pt-4 border-t">
          <h3 className="font-semibold text-gray-900 mb-3">Futár hozzárendelése</h3>
          <div className="flex gap-4">
            <Select
              value={selectedCourier || ''}
              onChange={(e) => setSelectedCourier(e.target.value)}
              options={[
                { value: '', label: 'Válasszon futárt' },
                ...couriers.map((c) => ({
                  value: c.id,
                  label: `${c.name} (${c.is_available ? 'Elérhető' : 'Foglalt'})`,
                })),
              ]}
              className="flex-1"
            />
            <Button onClick={assignCourier} disabled={!selectedCourier}>
              Hozzárendelés
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
