import { useState, useEffect } from 'react';
import type { Courier, Order } from '../../types';
import { supabase } from '../../lib/supabase';
import { useTenant } from '../../contexts/TenantContext';
import { Button, Card, Modal, Input, Select, Badge, EmptyState, Table } from '../common/Modal';
import { format } from 'date-fns';
import { hu } from 'date-fns/locale';
import {
  Plus,
  Truck,
  MapPin,
  Phone,
  Mail,
  Edit2,
  Trash2,
  CheckCircle,
  Clock,
  Star,
  Package,
  MoreVertical,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export function CourierManagement() {
  const { tenant } = useTenant();
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [courierOrders, setCourierOrders] = useState<Record<string, Order[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCourier, setEditingCourier] = useState<Courier | null>(null);

  useEffect(() => {
    loadCouriers();

    const channel = supabase
      .channel(`couriers:${tenant?.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'couriers',
          filter: `tenant_id=eq.${tenant?.id}`,
        },
        () => loadCouriers()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenant]);

  const loadCouriers = async () => {
    if (!tenant) return;

    try {
      const [couriersRes, ordersRes] = await Promise.all([
        supabase
          .from('couriers')
          .select('*')
          .eq('tenant_id', tenant.id)
          .eq('is_active', true)
          .order('name'),
        supabase
          .from('orders')
          .select('*, courier:profiles(*)')
          .eq('tenant_id', tenant.id)
          .in('status', ['out_for_delivery', 'delivered'])
          .order('created_at', { ascending: false })
          .limit(100),
      ]);

      if (couriersRes.data) {
        setCouriers(couriersRes.data as Courier[]);
      }

      if (ordersRes.data) {
        const byCourier: Record<string, Order[]> = {};
        ordersRes.data.forEach((order) => {
          if (order.courier_id) {
            if (!byCourier[order.courier_id]) {
              byCourier[order.courier_id] = [];
            }
            byCourier[order.courier_id].push(order as Order);
          }
        });
        setCourierOrders(byCourier);
      }
    } catch (error) {
      console.error('Failed to load couriers:', error);
      toast.error('Nem sikerült betölteni a futárokat');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCourier = async (courierData: Partial<Courier>) => {
    if (!tenant) return;

    try {
      const { error } = await supabase.from('couriers').insert({
        tenant_id: tenant.id,
        name: courierData.name || '',
        phone: courierData.phone || '',
        email: courierData.email || null,
        vehicle_type: courierData.vehicle_type || 'bicycle',
        is_available: true,
      });

      if (error) throw error;
      toast.success('Futár létrehozva');
      setShowCreateModal(false);
      loadCouriers();
    } catch (error) {
      console.error('Failed to create courier:', error);
      toast.error('Nem sikerült létrehozni a futárt');
    }
  };

  const handleUpdateCourier = async (courierData: Partial<Courier>) => {
    if (!editingCourier) return;

    try {
      const { error } = await supabase
        .from('couriers')
        .update({
          name: courierData.name,
          phone: courierData.phone,
          email: courierData.email,
          vehicle_type: courierData.vehicle_type,
        })
        .eq('id', editingCourier.id);

      if (error) throw error;
      toast.success('Futár frissítve');
      setEditingCourier(null);
      loadCouriers();
    } catch (error) {
      console.error('Failed to update courier:', error);
      toast.error('Nem sikerült frissíteni a futárt');
    }
  };

  const handleDeleteCourier = async (courierId: string) => {
    if (!confirm('Biztosan törli ezt a futárt?')) return;

    try {
      const { error } = await supabase
        .from('couriers')
        .update({ is_active: false })
        .eq('id', courierId);

      if (error) throw error;
      toast.success('Futár törölve');
      loadCouriers();
    } catch (error) {
      console.error('Failed to delete courier:', error);
      toast.error('Nem sikerült törölni a futárt');
    }
  };

  const toggleAvailability = async (courierId: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from('couriers')
        .update({ is_available: !currentState })
        .eq('id', courierId);

      if (error) throw error;
      loadCouriers();
    } catch (error) {
      console.error('Failed to toggle availability:', error);
      toast.error('Nem sikerült módosítani');
    }
  };

  const VEHICLE_LABELS: Record<string, string> = {
    bicycle: 'Kerékpár',
    motorcycle: 'Motor',
    car: 'Autó',
    scooter: 'Roller',
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
          <h2 className="text-xl font-bold text-gray-900">Futárok kezelése</h2>
          <p className="text-gray-500 mt-1">Kezelje a szállítási futárokat és rendeléseiket</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus size={18} className="mr-2" />
          Új futár
        </Button>
      </div>

      {/* Couriers Grid */}
      {couriers.length === 0 ? (
        <EmptyState
          icon={<Truck size={48} />}
          title="Nincsenek futárok"
          description="Adjon hozzá futárokat a kiszállításokhoz"
          action={
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus size={18} className="mr-2" />
              Új futár
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {couriers.map((courier) => {
            const orders = courierOrders[courier.id] || [];
            const activeOrders = orders.filter((o) => o.status === 'out_for_delivery');
            const todayDeliveries = orders.filter(
              (o) =>
                o.status === 'delivered' &&
                new Date(o.delivered_at || o.updated_at).toDateString() === new Date().toDateString()
            );

            return (
              <Card key={courier.id} className="hover:shadow-md transition-shadow">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          courier.is_available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        <Truck size={24} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{courier.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            variant={courier.is_available ? 'success' : 'default'}
                            size="sm"
                          >
                            {courier.is_available ? 'Elérhető' : 'Foglalt'}
                          </Badge>
                          <Badge variant="info" size="sm">
                            {VEHICLE_LABELS[courier.vehicle_type]}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setEditingCourier(courier)}
                      className="p-2 hover:bg-gray-100 rounded-lg"
                    >
                      <MoreVertical size={18} className="text-gray-500" />
                    </button>
                  </div>

                  {/* Contact */}
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Phone size={14} />
                      <span>{courier.phone}</span>
                    </div>
                    {courier.email && (
                      <div className="flex items-center gap-2">
                        <Mail size={14} />
                        <span>{courier.email}</span>
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4 py-3 border-y">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">{activeOrders.length}</p>
                      <p className="text-xs text-gray-500">Aktív</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">{todayDeliveries.length}</p>
                      <p className="text-xs text-gray-500">Ma</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Star size={16} className="text-yellow-500 fill-yellow-500" />
                        <span className="text-2xl font-bold text-gray-900">
                          {courier.rating.toFixed(1)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">Értékelés</p>
                    </div>
                  </div>

                  {/* Current Orders */}
                  {activeOrders.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700">Aktív rendelések:</p>
                      {activeOrders.slice(0, 3).map((order) => (
                        <div
                          key={order.id}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded"
                        >
                          <div>
                            <p className="text-sm font-medium">#{order.order_number}</p>
                            <p className="text-xs text-gray-500 truncate max-w-[150px]">
                              {order.delivery_address}
                            </p>
                          </div>
                          <p className="text-sm font-medium text-[var(--color-primary)]">
                            {order.total.toLocaleString('hu-HU')} Ft
                          </p>
                        </div>
                      ))}
                      {activeOrders.length > 3 && (
                        <p className="text-xs text-gray-500 text-center">
                          +{activeOrders.length - 3} további
                        </p>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => toggleAvailability(courier.id, courier.is_available)}
                    >
                      {courier.is_available ? 'Szünet' : 'Aktiválás'}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Settlement Report */}
      <Card>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Napi futár elszámolás</h3>
            <Button variant="outline" size="sm">
              <RefreshCw size={16} className="mr-2" />
              Frissítés
            </Button>
          </div>

          {Object.keys(courierOrders).length === 0 ? (
            <p className="text-gray-500">Nincsenek mai szállítások</p>
          ) : (
            <Table
              data={couriers.filter((c) => courierOrders[c.id]?.length > 0)}
              columns={[
                {
                  key: 'name',
                  header: 'Futár',
                  render: (c) => (
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                        <Truck size={14} />
                      </div>
                      <span className="font-medium">{c.name}</span>
                    </div>
                  ),
                },
                {
                  key: 'deliveries',
                  header: 'Szállítások',
                  render: (c) => {
                    const count = courierOrders[c.id]?.filter(
                      (o) => o.status === 'delivered'
                    ).length || 0;
                    return <Badge variant="info">{count} db</Badge>;
                  },
                },
                {
                  key: 'revenue',
                  header: 'Bevétel',
                  render: (c) => {
                    const total = courierOrders[c.id]
                      ?.filter((o) => o.status === 'delivered')
                      .reduce((sum, o) => sum + o.total, 0) || 0;
                    return <span className="font-medium">{total.toLocaleString('hu-HU')} Ft</span>;
                  },
                },
                {
                  key: 'actions',
                  header: '',
                  className: 'w-20',
                  render: (c) => (
                    <Button variant="outline" size="sm">
                      <Package size={14} className="mr-1" />
                      Nyomtatás
                    </Button>
                  ),
                },
              ]}
            />
          )}
        </div>
      </Card>

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Új futár létrehozása"
      >
        <CourierForm
          onSubmit={handleCreateCourier}
          onCancel={() => setShowCreateModal(false)}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingCourier}
        onClose={() => setEditingCourier(null)}
        title="Futár szerkesztése"
      >
        <CourierForm
          initialData={editingCourier || undefined}
          onSubmit={handleUpdateCourier}
          onCancel={() => setEditingCourier(null)}
          onDelete={editingCourier ? () => handleDeleteCourier(editingCourier.id) : undefined}
        />
      </Modal>
    </div>
  );
}

interface CourierFormProps {
  initialData?: Partial<Courier>;
  onSubmit: (data: Partial<Courier>) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

function CourierForm({ initialData, onSubmit, onCancel, onDelete }: CourierFormProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    phone: initialData?.phone || '',
    email: initialData?.email || '',
    vehicle_type: initialData?.vehicle_type || 'bicycle',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Név *"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        required
      />

      <Input
        label="Telefonszám *"
        value={formData.phone}
        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
        required
        type="tel"
      />

      <Input
        label="Email"
        type="email"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
      />

      <Select
        label="Jármű típus"
        value={formData.vehicle_type}
        onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
        options={[
          { value: 'bicycle', label: 'Kerékpár' },
          { value: 'motorcycle', label: 'Motor' },
          { value: 'car', label: 'Autó' },
          { value: 'scooter', label: 'Roller' },
        ]}
      />

      <div className="flex gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Mégse
        </Button>
        {onDelete && (
          <Button type="button" variant="danger" onClick={onDelete}>
            <Trash2 size={16} />
          </Button>
        )}
        <Button type="submit" className="flex-1">
          {initialData ? 'Mentés' : 'Létrehozás'}
        </Button>
      </div>
    </form>
  );
}
