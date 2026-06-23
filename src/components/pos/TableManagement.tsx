import { useState, useEffect, useCallback, useRef } from 'react';
import type { RestaurantTable, Order } from '../../types';
import { supabase } from '../../lib/supabase';
import { useTenant } from '../../contexts/TenantContext';
import { Button, Card, Modal, Input, Select, Badge, EmptyState } from '../common/Modal';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Plus,
  MoreVertical,
  Square,
  Circle,
  Trash2,
  Edit2,
  ShoppingCart,
  CheckCircle,
  Clock,
  ChevronDown,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface TableManagementProps {
  onSelectTable?: (tableId: string) => void;
}

export function TableManagement({ onSelectTable }: TableManagementProps) {
  const { tenant } = useTenant();
  const navigate = useNavigate();
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [activeOrders, setActiveOrders] = useState<Record<string, Order>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTable, setEditingTable] = useState<RestaurantTable | null>(null);

  const channelsRef = useRef<RealtimeChannel | null>(null);

  const loadTables = async () => {
    if (!tenant) return;

    try {
      const { data, error } = await supabase
        .from('restaurant_tables')
        .select('*')
        .eq('tenant_id', tenant.id)
        .eq('is_active', true)
        .order('table_number');

      if (error) throw error;
      setTables(data as RestaurantTable[]);

      const activeTableIds = data
        .filter((t) => t.status === 'occupied' || t.status === 'bill_requested')
        .map((t) => t.id);

      if (activeTableIds.length > 0) {
        const { data: ordersData } = await supabase
          .from('orders')
          .select('*, items:order_items(*)')
          .in('table_id', activeTableIds)
          .in('status', ['pending', 'confirmed', 'preparing'])
          .order('created_at', { ascending: false });

        const ordersByTable: Record<string, Order> = {};
        ordersData?.forEach((order) => {
          if (order.table_id) {
            ordersByTable[order.table_id] = order as Order;
          }
        });
        setActiveOrders(ordersByTable);
      }
    } catch (error) {
      console.error('Failed to load tables:', error);
      toast.error('Nem sikerült betölteni az asztalokat');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTables();

    return () => {
      if (channelsRef.current) {
        supabase.removeChannel(channelsRef.current);
      }
    };
  }, [tenant]);

  useEffect(() => {
    if (!tenant) return;

    const channel = supabase
      .channel(`tables:${tenant.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'restaurant_tables',
          filter: `tenant_id=eq.${tenant.id}`,
        },
        () => {
          loadTables();
        }
      )
      .subscribe();

    channelsRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenant]);

  const handleCreateTable = async (tableData: Partial<RestaurantTable>) => {
    if (!tenant) return;

    try {
      const { error } = await supabase.from('restaurant_tables').insert({
        tenant_id: tenant.id,
        table_number: tableData.table_number || '',
        name: tableData.name || null,
        capacity: tableData.capacity || 4,
        shape: tableData.shape || 'square',
        position_x: tableData.position_x || 0,
        position_y: tableData.position_y || 0,
        width: tableData.width || 80,
        height: tableData.height || 80,
        section: tableData.section || null,
        status: 'available',
      });

      if (error) throw error;
      toast.success('Asztal létrehozva');
      setShowCreateModal(false);
      loadTables();
    } catch (error) {
      console.error('Failed to create table:', error);
      toast.error('Nem sikerült létrehozni az asztalt');
    }
  };

  const handleUpdateTable = async (tableData: Partial<RestaurantTable>) => {
    if (!editingTable || !tenant) return;

    try {
      const { error } = await supabase
        .from('restaurant_tables')
        .update({
          table_number: tableData.table_number,
          name: tableData.name,
          capacity: tableData.capacity,
          shape: tableData.shape,
          width: tableData.width,
          height: tableData.height,
          section: tableData.section,
        })
        .eq('id', editingTable.id);

      if (error) throw error;
      toast.success('Asztal frissítve');
      setEditingTable(null);
      loadTables();
    } catch (error) {
      console.error('Failed to update table:', error);
      toast.error('Nem sikerült frissíteni az asztalt');
    }
  };

  const handleDeleteTable = async (tableId: string) => {
    if (!confirm('Biztosan törli ezt az asztalt?')) return;

    try {
      const { error } = await supabase
        .from('restaurant_tables')
        .update({ is_active: false })
        .eq('id', tableId);

      if (error) throw error;
      toast.success('Asztal törölve');
      loadTables();
    } catch (error) {
      console.error('Failed to delete table:', error);
      toast.error('Nem sikerült törölni az asztalt');
    }
  };

  const handleTableClick = (table: RestaurantTable) => {
    if (table.status === 'available') {
      onSelectTable?.(table.id);
      navigate(`/pos?tableId=${table.id}`);
    } else {
      const order = activeOrders[table.id];
      if (order) {
        navigate(`/orders/${order.id}`);
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 border-green-500 text-green-700';
      case 'occupied':
        return 'bg-red-100 border-red-500 text-red-700';
      case 'reserved':
        return 'bg-yellow-100 border-yellow-500 text-yellow-700';
      case 'bill_requested':
        return 'bg-blue-100 border-blue-500 text-blue-700';
      default:
        return 'bg-gray-100 border-gray-500 text-gray-700';
    }
  };

  const getStatusBadge = (status: string) => {
    const labels: Record<string, string> = {
      available: 'Szabad',
      occupied: 'Foglalt',
      reserved: 'Foglalt időpontra',
      bill_requested: 'Számla kérve',
    };

    const variants: Record<string, 'success' | 'error' | 'warning' | 'info'> = {
      available: 'success',
      occupied: 'error',
      reserved: 'warning',
      bill_requested: 'info',
    };

    return <Badge variant={variants[status]}>{labels[status] || status}</Badge>;
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
          <h2 className="text-xl font-bold text-gray-900">Asztalok kezelése</h2>
          <p className="text-gray-500 mt-1">Kattintson egy asztalra a rendeléshez</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus size={18} className="mr-2" />
          Új asztal
        </Button>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-green-500" />
          <span className="text-sm text-gray-600">Szabad</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-red-500" />
          <span className="text-sm text-gray-600">Foglalt</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-yellow-500" />
          <span className="text-sm text-gray-600">Foglalt időpontra</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-blue-500" />
          <span className="text-sm text-gray-600">Számla kérve</span>
        </div>
      </div>

      {/* Tables Grid */}
      {tables.length === 0 ? (
        <EmptyState
          title="Nincsenek asztalok"
          description="Hozzon létre asztalokat a rendelések kezeléséhez"
          action={
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus size={18} className="mr-2" />
              Új asztal
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {tables.map((table) => {
            const order = activeOrders[table.id];
            const totalItems = order?.items?.length || 0;
            const totalAmount = order?.total || 0;

            return (
              <Card
                key={table.id}
                className={`cursor-pointer hover:shadow-lg transition-all border-2 ${getStatusColor(table.status)}`}
                padding="none"
                onClick={() => handleTableClick(table)}
              >
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div
                      className={`w-10 h-10 ${
                        table.shape === 'circle' ? 'rounded-full' : 'rounded-lg'
                      } bg-white shadow flex items-center justify-center font-bold text-lg`}
                    >
                      {table.table_number}
                    </div>
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingTable(table);
                        }}
                        className="p-1.5 hover:bg-white/50 rounded"
                      >
                        <MoreVertical size={16} />
                      </button>
                    </div>
                  </div>

                  {table.name && (
                    <p className="text-sm font-medium text-gray-600 mb-2">{table.name}</p>
                  )}

                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                    <Users size={14} />
                    <span>{table.capacity} fő</span>
                  </div>

                  {order && (
                    <div className="mt-3 pt-3 border-t border-current/20 space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <ShoppingCart size={14} />
                        <span>{totalItems} tétel</span>
                      </div>
                      <div className="font-semibold">
                        {totalAmount.toLocaleString('hu-HU')} Ft
                      </div>
                    </div>
                  )}

                  {order?.status === 'preparing' && (
                    <div className="mt-2 flex items-center gap-1 text-xs">
                      <Clock size={12} className="animate-pulse" />
                      <span>Elkészítés alatt</span>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Új asztal létrehozása"
      >
        <TableForm
          onSubmit={handleCreateTable}
          onCancel={() => setShowCreateModal(false)}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingTable}
        onClose={() => setEditingTable(null)}
        title="Asztal szerkesztése"
      >
        <TableForm
          initialData={editingTable || undefined}
          onSubmit={handleUpdateTable}
          onCancel={() => setEditingTable(null)}
          onDelete={editingTable ? () => handleDeleteTable(editingTable.id) : undefined}
        />
      </Modal>
    </div>
  );
}

interface TableFormProps {
  initialData?: Partial<RestaurantTable>;
  onSubmit: (data: Partial<RestaurantTable>) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

function TableForm({ initialData, onSubmit, onCancel, onDelete }: TableFormProps) {
  const [formData, setFormData] = useState({
    table_number: initialData?.table_number || '',
    name: initialData?.name || '',
    capacity: initialData?.capacity || 4,
    shape: initialData?.shape || 'square',
    section: initialData?.section || '',
    width: initialData?.width || 80,
    height: initialData?.height || 80,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Asztal száma *"
        value={formData.table_number}
        onChange={(e) => setFormData({ ...formData, table_number: e.target.value })}
        required
        placeholder="pl. 1, A1, 12"
      />

      <Input
        label="Név (opcionális)"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        placeholder="pl. Családi asztal, Erkély"
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Férőhely *"
          type="number"
          value={formData.capacity.toString()}
          onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
          min={1}
          max={20}
        />

        <Select
          label="Alak"
          value={formData.shape}
          onChange={(e) => setFormData({ ...formData, shape: e.target.value })}
          options={[
            { value: 'square', label: 'Négyzet' },
            { value: 'circle', label: 'Kör' },
            { value: 'rectangle', label: 'Téglalap' },
          ]}
        />
      </div>

      <Input
        label="Szekció"
        value={formData.section}
        onChange={(e) => setFormData({ ...formData, section: e.target.value })}
        placeholder="pl. Főterem, Terasz, VIP"
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
