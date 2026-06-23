import { useState, useEffect } from 'react';
import type { Tenant, PartnerRequest, Plan } from '../../types';
import { supabase } from '../../lib/supabase';
import { Button, Card, Modal, Input, Select, Badge, Table, EmptyState } from '../common/Modal';
import { format } from 'date-fns';
import { hu } from 'date-fns/locale';
import {
  Users,
  Building2,
  Package,
  CreditCard,
  Settings,
  CheckCircle,
  XCircle,
  Clock,
  Mail,
  Phone,
  Globe,
  Plus,
  MoreVertical,
  Trash2,
  Edit2,
  Search,
  AlertTriangle,
  BarChart3,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

type AdminView = 'partners' | 'requests' | 'plans' | 'analytics';

export function PlatformAdminPanel() {
  const [activeView, setActiveView] = useState<AdminView>('partners');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const menuItems = [
    { id: 'partners', icon: Building2, label: 'Partnerek', count: 0 },
    { id: 'requests', icon: Mail, label: 'Jelentkezések', count: 0 },
    { id: 'plans', icon: Package, label: 'Csomagok' },
    { id: 'analytics', icon: BarChart3, label: 'Statisztikák' },
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarCollapsed ? 'w-20' : 'w-64'
        } bg-gray-900 text-white flex flex-col transition-all`}
      >
        <div className="p-4 flex items-center justify-between border-b border-gray-800">
          {!sidebarCollapsed && (
            <div>
              <h1 className="font-bold text-lg">syorder.hu</h1>
              <p className="text-xs text-gray-400">Platform Admin</p>
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 hover:bg-gray-800 rounded"
          >
            {sidebarCollapsed ? '→' : '←'}
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id as AdminView)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  activeView === item.id
                    ? 'bg-[var(--color-primary)]'
                    : 'hover:bg-gray-800'
                }`}
              >
                <Icon size={20} />
                {!sidebarCollapsed && <span>{item.label}</span>}
                {!sidebarCollapsed && item.count !== undefined && item.count > 0 && (
                  <Badge variant="error" size="sm" className="ml-auto">
                    {item.count}
                  </Badge>
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        <header className="bg-white border-b px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900">
            {menuItems.find((m) => m.id === activeView)?.label}
          </h1>
        </header>

        <div className="flex-1 p-6 overflow-auto">
          {activeView === 'partners' && <PartnersList />}
          {activeView === 'requests' && <PartnerRequestsList />}
          {activeView === 'plans' && <PlansManager />}
          {activeView === 'analytics' && <AnalyticsDashboard />}
        </div>
      </main>
    </div>
  );
}

function PartnersList() {
  const [partners, setPartners] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editingPartner, setEditingPartner] = useState<Tenant | null>(null);

  useEffect(() => {
    loadPartners();

    const channel = supabase
      .channel('platform:tenants')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tenants' },
        () => loadPartners()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadPartners = async () => {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPartners(data as Tenant[]);
    } catch (error) {
      console.error('Failed to load partners:', error);
      toast.error('Nem sikerült betölteni a partnereket');
    } finally {
      setIsLoading(false);
    }
  };

  const updateLicense = async (tenantId: string, status: string, expiresAt?: string) => {
    try {
      const { error } = await supabase
        .from('tenants')
        .update({
          license_status: status,
          license_expires_at: expiresAt || null,
        })
        .eq('id', tenantId);

      if (error) throw error;
      toast.success('Licenc frissítve');
      loadPartners();
    } catch (error) {
      console.error('Failed to update license:', error);
      toast.error('Nem sikerült frissíteni a licencet');
    }
  };

  const filteredPartners = partners.filter((p) => {
    if (statusFilter !== 'all' && p.license_status !== statusFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(query) ||
        p.slug.toLowerCase().includes(query) ||
        p.email.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const STATUS_LABELS: Record<string, { label: string; variant: 'success' | 'warning' | 'error' | 'default' }> = {
    active: { label: 'Aktív', variant: 'success' },
    trial: { label: 'Próba', variant: 'warning' },
    suspended: { label: 'Felfüggesztve', variant: 'error' },
    expired: { label: 'Lejárt', variant: 'default' },
    pending: { label: 'Függőben', variant: 'warning' },
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Input
            placeholder="Keresés..."
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
            { value: 'active', label: 'Aktív' },
            { value: 'trial', label: 'Próba' },
            { value: 'suspended', label: 'Felfüggesztve' },
            { value: 'expired', label: 'Lejárt' },
          ]}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <div className="text-center">
            <p className="text-3xl font-bold text-gray-900">{partners.length}</p>
            <p className="text-sm text-gray-500">Összes partner</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-3xl font-bold text-green-600">
              {partners.filter((p) => p.license_status === 'active').length}
            </p>
            <p className="text-sm text-gray-500">Aktív</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-3xl font-bold text-yellow-600">
              {partners.filter((p) => p.license_status === 'trial').length}
            </p>
            <p className="text-sm text-gray-500">Próba</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-3xl font-bold text-red-600">
              {partners.filter((p) => p.license_status === 'suspended').length}
            </p>
            <p className="text-sm text-gray-500">Felfüggesztve</p>
          </div>
        </Card>
      </div>

      {/* Table */}
      <Card padding="none">
        <Table
          data={filteredPartners}
          columns={[
            {
              key: 'name',
              header: 'Étterem',
              render: (p) => (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center font-bold">
                    {p.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-sm text-gray-500">{p.slug}</p>
                  </div>
                </div>
              ),
            },
            {
              key: 'contact',
              header: 'Kapcsolat',
              render: (p) => (
                <div className="space-y-1">
                  <p className="text-sm">{p.email}</p>
                  {p.phone && <p className="text-xs text-gray-500">{p.phone}</p>}
                </div>
              ),
            },
            {
              key: 'license',
              header: 'Licenc',
              render: (p) => {
                const status = STATUS_LABELS[p.license_status] || { label: p.license_status, variant: 'default' as const };
                return (
                  <div className="space-y-1">
                    <Badge variant={status.variant}>{status.label}</Badge>
                    {p.license_expires_at && (
                      <p className="text-xs text-gray-500">
                        {format(new Date(p.license_expires_at), 'yyyy.MM.dd')}
                      </p>
                    )}
                  </div>
                );
              },
            },
            {
              key: 'plan',
              header: 'Csomag',
              render: (p) => <Badge>{p.plan || 'basic'}</Badge>,
            },
            {
              key: 'created',
              header: 'Létrehozva',
              render: (p) => format(new Date(p.created_at), 'yyyy.MM.dd'),
            },
            {
              key: 'actions',
              header: '',
              className: 'w-48',
              render: (p) => (
                <div className="flex gap-2">
                  {p.license_status !== 'active' && (
                    <Button
                      variant="success"
                      size="sm"
                      onClick={() => {
                        const expires = new Date();
                        expires.setFullYear(expires.getFullYear() + 1);
                        updateLicense(p.id, 'active', expires.toISOString());
                      }}
                    >
                      Aktiválás
                    </Button>
                  )}
                  {p.license_status === 'active' && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => updateLicense(p.id, 'suspended')}
                    >
                      Felfüggesztés
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingPartner(p)}
                  >
                    <MoreVertical size={14} />
                  </Button>
                </div>
              ),
            },
          ]}
        />
      </Card>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingPartner}
        onClose={() => setEditingPartner(null)}
        title="Partner szerkesztése"
        size="lg"
      >
        {editingPartner && (
          <PartnerEditForm
            partner={editingPartner}
            onSave={async (data) => {
              const { error } = await supabase
                .from('tenants')
                .update(data)
                .eq('id', editingPartner.id);
              if (!error) {
                toast.success('Mentve');
                setEditingPartner(null);
                loadPartners();
              }
            }}
            onClose={() => setEditingPartner(null)}
          />
        )}
      </Modal>
    </div>
  );
}

function PartnerEditForm({ partner, onSave, onClose }: { partner: Tenant; onSave: (data: any) => void; onClose: () => void }) {
  const [formData, setFormData] = useState({
    name: partner.name,
    slug: partner.slug,
    domain: partner.domain || '',
    email: partner.email,
    phone: partner.phone || '',
    plan: partner.plan,
    license_status: partner.license_status,
    license_expires_at: partner.license_expires_at?.split('T')[0] || '',
    primary_color: partner.primary_color,
    settings: partner.settings || {},
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(formData); }} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input label="Név" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
        <Input label="Slug" value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} />
        <Input label="Domain" value={formData.domain} onChange={(e) => setFormData({ ...formData, domain: e.target.value })} />
        <Input label="Email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
        <Input label="Telefon" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
        <Input label="Szín" type="color" value={formData.primary_color} onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })} />
        <Select
          label="Csomag"
          value={formData.plan}
          onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
          options={[
            { value: 'basic', label: 'Alap' },
            { value: 'professional', label: 'Professzionális' },
            { value: 'enterprise', label: 'Vállalati' },
          ]}
        />
        <Select
          label="Licenc státusz"
          value={formData.license_status}
          onChange={(e) => setFormData({ ...formData, license_status: e.target.value })}
          options={[
            { value: 'active', label: 'Aktív' },
            { value: 'trial', label: 'Próba' },
            { value: 'suspended', label: 'Felfüggesztve' },
            { value: 'expired', label: 'Lejárt' },
          ]}
        />
        {formData.license_status === 'active' && (
          <Input
            label="Lejárat"
            type="date"
            value={formData.license_expires_at}
            onChange={(e) => setFormData({ ...formData, license_expires_at: e.target.value })}
            className="col-span-2"
          />
        )}
      </div>
      <div className="flex gap-3 pt-4">
        <Button variant="outline" onClick={onClose} className="flex-1">Mégse</Button>
        <Button type="submit" className="flex-1">Mentés</Button>
      </div>
    </form>
  );
}

function PartnerRequestsList() {
  const [requests, setRequests] = useState<PartnerRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadRequests();

    const channel = supabase
      .channel('partner_requests')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'partner_requests' },
        () => loadRequests()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadRequests = async () => {
    try {
      const { data } = await supabase
        .from('partner_requests')
        .select('*')
        .order('created_at', { ascending: false });
      if (data) setRequests(data as PartnerRequest[]);
    } catch (error) {
      console.error('Failed to load requests:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequest = async (request: PartnerRequest, approve: boolean) => {
    if (approve) {
      const slug = request.desired_slug || request.restaurant_name.toLowerCase().replace(/\s+/g, '-');

      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .insert({
          name: request.restaurant_name,
          slug,
          email: request.contact_email,
          phone: request.contact_phone,
          license_status: 'trial',
          license_expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select()
        .single();

      if (tenantError) {
        toast.error('Nem sikerült létrehozni a partnert');
        return;
      }

      await supabase
        .from('partner_requests')
        .update({ status: 'approved', tenant_id: tenant.id, processed_at: new Date().toISOString() })
        .eq('id', request.id);

      toast.success('Partner jóváhagyva');
    } else {
      await supabase
        .from('partner_requests')
        .update({ status: 'rejected', processed_at: new Date().toISOString() })
        .eq('id', request.id);
      toast.success('Jelentkezés elutasítva');
    }

    loadRequests();
  };

  const pendingRequests = requests.filter((r) => r.status === 'pending');

  if (isLoading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" /></div>;
  }

  return (
    <div className="space-y-6">
      {pendingRequests.length === 0 ? (
        <EmptyState title="Nincs függő jelentkezés" description="Minden jelentkezést elbíráltunk" />
      ) : (
        <div className="space-y-4">
          {pendingRequests.map((req) => (
            <Card key={req.id}>
              <div className="flex items-start justify-between">
                <div className="space-y-3">
                  <div>
                    <h3 className="font-semibold text-lg">{req.restaurant_name}</h3>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Mail size={14} /> {req.contact_email}
                      </span>
                      {req.contact_phone && (
                        <span className="flex items-center gap-1">
                          <Phone size={14} /> {req.contact_phone}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-500">Kapcsolattartó:</span> {req.contact_name}
                  </div>
                  {req.notes && (
                    <p className="text-sm text-gray-600 italic">{req.notes}</p>
                  )}
                  <p className="text-xs text-gray-400">
                    {format(new Date(req.created_at), 'yyyy.MM.dd HH:mm')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="success" onClick={() => handleRequest(req, true)}>
                    <CheckCircle size={16} className="mr-2" />
                    Jóváhagyás
                  </Button>
                  <Button variant="danger" onClick={() => handleRequest(req, false)}>
                    <XCircle size={16} className="mr-2" />
                    Elutasítás
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function PlansManager() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const { data } = await supabase.from('plans').select('*').order('sort_order');
      if (data) setPlans(data as Plan[]);
    } catch (error) {
      console.error('Failed to load plans:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-3 gap-6">
      {plans.map((plan) => (
        <Card key={plan.id} className={plan.is_popular ? 'ring-2 ring-[var(--color-primary)]' : ''}>
          <div className="text-center space-y-4">
            {plan.is_popular && (
              <Badge variant="info" className="absolute top-4 right-4">Népszerű</Badge>
            )}
            <h3 className="text-xl font-bold">{plan.name}</h3>
            <div>
              <span className="text-4xl font-bold">{plan.monthly_price.toLocaleString('hu-HU')}</span>
              <span className="text-gray-500"> Ft/hó</span>
            </div>
            <ul className="space-y-2 text-left">
              {plan.features?.map((feature, idx) => (
                <li key={idx} className="flex items-center gap-2 text-sm">
                  <CheckCircle size={14} className="text-green-500" />
                  {feature}
                </li>
              ))}
            </ul>
            <Button variant={plan.is_popular ? 'primary' : 'outline'} className="w-full">
              Választás
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}

function AnalyticsDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <p className="text-sm text-gray-500">Összes partner</p>
          <p className="text-3xl font-bold mt-2">12</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Aktív estezések</p>
          <p className="text-3xl font-bold mt-2">1,234</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Havi bevétel</p>
          <p className="text-3xl font-bold mt-2">238,800 Ft</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Havi növekedés</p>
          <p className="text-3xl font-bold mt-2 text-green-600">+15%</p>
        </Card>
      </div>

      <Card>
        <h3 className="font-semibold mb-4">Rendszer teljesítmény</h3>
        <div className="h-64 flex items-center justify-center text-gray-400">
          Grafikon helye
        </div>
      </Card>
    </div>
  );
}
