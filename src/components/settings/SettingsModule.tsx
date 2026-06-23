import { useState, useEffect, useRef } from 'react';
import type { Tenant, OperatingHours } from '../../types';
import { supabase } from '../../lib/supabase';
import { useTenant } from '../../contexts/TenantContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Button, Card, Modal, Input, Select, Badge, EmptyState } from '../common/Modal';
import {
  Settings,
  Palette,
  Clock,
  Truck,
  CreditCard,
  Save,
  Upload,
  Globe,
  MapPin,
  Bell,
  Printer,
  Plus,
  Trash2,
  CheckCircle,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

type SettingsView = 'branding' | 'hours' | 'delivery' | 'zones' | 'payments' | 'notifications' | 'printers';

interface DeliveryZone {
  id: string;
  tenant_id: string;
  name: string;
  search_key: string;
  zone_type: string;
  postal_code: string | null;
  extra_fee: number;
  min_order_amount: number;
  is_active: boolean;
}

export function SettingsModule() {
  const { tenant } = useTenant();
  const { colors } = useTheme();
  const [activeView, setActiveView] = useState<SettingsView>('branding');
  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Branding
  const [branding, setBranding] = useState({
    name: tenant?.name || '',
    primary_color: tenant?.primary_color || '#3B82F6',
    secondary_color: tenant?.secondary_color || '#10B981',
    accent_color: tenant?.accent_color || '#F59E0B',
    logo_url: tenant?.logo_url || '',
  });

  // Operating Hours
  const [operatingHours, setOperatingHours] = useState<OperatingHours>(
    tenant?.operating_hours || {
      mon: { open: '08:00', close: '22:00' },
      tue: { open: '08:00', close: '22:00' },
      wed: { open: '08:00', close: '22:00' },
      thu: { open: '08:00', close: '22:00' },
      fri: { open: '08:00', close: '22:00' },
      sat: { open: '10:00', close: '23:00' },
      sun: { open: '10:00', close: '21:00' },
    }
  );

  // Delivery
  const [delivery, setDelivery] = useState({
    delivery_fee: tenant?.delivery_fee || 500,
    min_order_amount: tenant?.min_order_amount || 2000,
    delivery_radius_km: tenant?.settings?.max_delivery_distance || 10,
  });

  // Payments
  const [payments, setPayments] = useState({
    accept_cash: tenant?.settings?.accept_cash ?? true,
    accept_card: tenant?.settings?.accept_card ?? true,
    accept_online: tenant?.settings?.accept_online ?? false,
  });

  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (tenant) {
      setBranding({
        name: tenant.name,
        primary_color: tenant.primary_color,
        secondary_color: tenant.secondary_color,
        accent_color: tenant.accent_color,
        logo_url: tenant.logo_url || '',
      });
      setOperatingHours(tenant.operating_hours || getDefaultHours());
      setDelivery({
        delivery_fee: tenant.delivery_fee,
        min_order_amount: tenant.min_order_amount,
        delivery_radius_km: tenant.settings?.max_delivery_distance || 10,
      });
      setPayments({
        accept_cash: tenant.settings?.accept_cash ?? true,
        accept_card: tenant.settings?.accept_card ?? true,
        accept_online: tenant.settings?.accept_online ?? false,
      });
    }
  }, [tenant]);

  const getDefaultHours = (): OperatingHours => ({
    mon: { open: '08:00', close: '22:00' },
    tue: { open: '08:00', close: '22:00' },
    wed: { open: '08:00', close: '22:00' },
    thu: { open: '08:00', close: '22:00' },
    fri: { open: '08:00', close: '22:00' },
    sat: { open: '10:00', close: '23:00' },
    sun: { open: '10:00', close: '21:00' },
  });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !tenant) return;

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        setBranding({ ...branding, logo_url: dataUrl });
        setHasChanges(true);
        toast.success('Logo feltöltve');
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error('Nem sikerült feltölteni a logót');
    }
  };

  const saveSettings = async () => {
    if (!tenant) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('tenants')
        .update({
          name: branding.name,
          primary_color: branding.primary_color,
          secondary_color: branding.secondary_color,
          accent_color: branding.accent_color,
          logo_url: branding.logo_url || null,
          operating_hours: operatingHours,
          delivery_fee: delivery.delivery_fee,
          min_order_amount: shipping.min_order_amount,
          settings: {
            ...tenant.settings,
            accept_cash: payments.accept_cash,
            accept_card: payments.accept_card,
            accept_online: payments.accept_online,
            max_delivery_distance: delivery.delivery_radius_km,
          },
        })
        .eq('id', tenant.id);

      if (error) throw error;

      toast.success('Beállítások mentve');
      setHasChanges(false);
      window.location.reload();
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Nem sikerült menteni');
    } finally {
      setIsLoading(false);
    }
  };

  // Fix shipping variable typo
  const shipping = delivery;

  const DAYS: Record<string, string> = {
    mon: 'Hétfő',
    tue: 'Kedd',
    wed: 'Szerda',
    thu: 'Csütörtök',
    fri: 'Péntek',
    sat: 'Szombat',
    sun: 'Vasárnap',
  };

  const menuItems = [
    { id: 'branding', icon: Palette, label: 'Arculat' },
    { id: 'hours', icon: Clock, label: 'Nyitvatartás' },
    { id: 'delivery', icon: Truck, label: 'Szállítás' },
    { id: 'zones', icon: MapPin, label: 'Szállítási zónák' },
    { id: 'payments', icon: CreditCard, label: 'Fizetés' },
    { id: 'notifications', icon: Bell, label: 'Értesítések' },
    { id: 'printers', icon: Printer, label: 'Nyomtatók' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Beállítások</h2>
          <p className="text-gray-500 mt-1">Testreszabhatja éttermének profilját</p>
        </div>
        {hasChanges && (
          <Button onClick={saveSettings} isLoading={isLoading}>
            <Save size={16} className="mr-2" />
            Mentés
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id as SettingsView)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeView === item.id
                  ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      {activeView === 'branding' && (
        <div className="grid grid-cols-2 gap-6">
          <Card>
            <h3 className="font-semibold mb-4">Alapadatok</h3>
            <div className="space-y-4">
              <Input
                label="Étterem neve"
                value={branding.name}
                onChange={(e) => {
                  setBranding({ ...branding, name: e.target.value });
                  setHasChanges(true);
                }}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Logo</label>
                <div className="flex items-center gap-4">
                  <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                    {branding.logo_url ? (
                      <img
                        src={branding.logo_url}
                        alt="Logo"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Globe size={32} className="text-gray-400" />
                    )}
                  </div>
                  <div>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <Button variant="outline" onClick={() => logoInputRef.current?.click()}>
                      <Upload size={16} className="mr-2" />
                      Upload logo
                    </Button>
                    <p className="text-xs text-gray-500 mt-1">Max 2MB, JPG vagy PNG</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="font-semibold mb-4">Színek</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Elsődleges szín</label>
                <div className="flex gap-3">
                  <input
                    type="color"
                    value={branding.primary_color}
                    onChange={(e) => {
                      setBranding({ ...branding, primary_color: e.target.value });
                      setHasChanges(true);
                    }}
                    className="w-12 h-12 rounded cursor-pointer"
                  />
                  <Input
                    value={branding.primary_color}
                    onChange={(e) => {
                      setBranding({ ...branding, primary_color: e.target.value });
                      setHasChanges(true);
                    }}
                    className="flex-1"
                  />
                </div>
                <div
                  className="mt-2 p-4 rounded text-white"
                  style={{ backgroundColor: branding.primary_color }}
                >
                  Előnézet
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Másodlagos szín</label>
                <div className="flex gap-3">
                  <input
                    type="color"
                    value={branding.secondary_color}
                    onChange={(e) => {
                      setBranding({ ...branding, secondary_color: e.target.value });
                      setHasChanges(true);
                    }}
                    className="w-12 h-12 rounded cursor-pointer"
                  />
                  <Input
                    value={branding.secondary_color}
                    onChange={(e) => {
                      setBranding({ ...branding, secondary_color: e.target.value });
                      setHasChanges(true);
                    }}
                    className="flex-1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Hangsúly szín</label>
                <div className="flex gap-3">
                  <input
                    type="color"
                    value={branding.accent_color}
                    onChange={(e) => {
                      setBranding({ ...branding, accent_color: e.target.value });
                      setHasChanges(true);
                    }}
                    className="w-12 h-12 rounded cursor-pointer"
                  />
                  <Input
                    value={branding.accent_color}
                    onChange={(e) => {
                      setBranding({ ...branding, accent_color: e.target.value });
                      setHasChanges(true);
                    }}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Landing Page Preview */}
          <Card className="col-span-2">
            <h3 className="font-semibold mb-4">Főoldal előnézet</h3>
            <div
              className="h-48 rounded-lg overflow-hidden"
              style={{ backgroundColor: branding.primary_color }}
            >
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-white">
                  {branding.logo_url ? (
                    <img src={branding.logo_url} alt="" className="h-16 mx-auto mb-4" />
                  ) : (
                    <div
                      className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl font-bold"
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.2)',
                        border: `2px solid ${branding.secondary_color}`,
                      }}
                    >
                      {branding.name.charAt(0)}
                    </div>
                  )}
                  <h2 className="text-3xl font-bold">{branding.name}</h2>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeView === 'hours' && (
        <Card>
          <h3 className="font-semibold mb-4">Nyitvatartási idő</h3>
          <div className="space-y-3">
            {Object.entries(DAYS).map(([key, label]) => (
              <div key={key} className="flex items-center gap-4">
                <span className="w-24 font-medium">{label}</span>
                <Input
                  type="time"
                  value={operatingHours[key]?.open || '08:00'}
                  onChange={(e) => {
                    setOperatingHours({
                      ...operatingHours,
                      [key]: { ...operatingHours[key], open: e.target.value },
                    });
                    setHasChanges(true);
                  }}
                  className="w-32"
                />
                <span className="text-gray-500">-</span>
                <Input
                  type="time"
                  value={operatingHours[key]?.close || '22:00'}
                  onChange={(e) => {
                    setOperatingHours({
                      ...operatingHours,
                      [key]: { ...operatingHours[key], close: e.target.value },
                    });
                    setHasChanges(true);
                  }}
                  className="w-32"
                />
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={operatingHours[key]?.closed}
                    onChange={(e) => {
                      setOperatingHours({
                        ...operatingHours,
                        [key]: { ...operatingHours[key], closed: e.target.checked },
                      });
                      setHasChanges(true);
                    }}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-600">Zárva</span>
                </label>
              </div>
            ))}
          </div>
        </Card>
      )}

      {activeView === 'delivery' && (
        <div className="grid grid-cols-2 gap-6">
          <Card>
            <h3 className="font-semibold mb-4">Szállítási beállítások</h3>
            <div className="space-y-4">
              <Input
                label="Szállítási díj (Ft)"
                type="number"
                value={delivery.delivery_fee.toString()}
                onChange={(e) => {
                  setDelivery({ ...delivery, delivery_fee: parseFloat(e.target.value) });
                  setHasChanges(true);
                }}
              />
              <Input
                label="Minimális rendelési érték (Ft)"
                type="number"
                value={delivery.min_order_amount.toString()}
                onChange={(e) => {
                  setDelivery({ ...delivery, min_order_amount: parseFloat(e.target.value) });
                  setHasChanges(true);
                }}
              />
              <Input
                label="Szállítási távolság (km)"
                type="number"
                value={delivery.delivery_radius_km.toString()}
                onChange={(e) => {
                  setDelivery({ ...delivery, delivery_radius_km: parseFloat(e.target.value) });
                  setHasChanges(true);
                }}
              />
            </div>
          </Card>

        </div>
      )}

      {activeView === 'zones' && tenant && (
        <DeliveryZonesManager tenantId={tenant.id} />
      )}

      {activeView === 'payments' && (
        <Card>
          <h3 className="font-semibold mb-4">Fizetési módok</h3>
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={payments.accept_cash}
                onChange={(e) => {
                  setPayments({ ...payments, accept_cash: e.target.checked });
                  setHasChanges(true);
                }}
                className="w-5 h-5"
              />
              <div>
                <p className="font-medium">Készpénz</p>
                <p className="text-sm text-gray-500">Fizetés készpénzzel a helyszínen</p>
              </div>
            </label>
            <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={payments.accept_card}
                onChange={(e) => {
                  setPayments({ ...payments, accept_card: e.target.checked });
                  setHasChanges(true);
                }}
                className="w-5 h-5"
              />
              <div>
                <p className="font-medium">Bankkártya</p>
                <p className="text-sm text-gray-500">POS terminálos fizetés</p>
              </div>
            </label>
            <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={payments.accept_online}
                onChange={(e) => {
                  setPayments({ ...payments, accept_online: e.target.checked });
                  setHasChanges(true);
                }}
                className="w-5 h-5"
              />
              <div>
                <p className="font-medium">Online fizetés</p>
                <p className="text-sm text-gray-500">Bankkártyás fizetés rendeléskor</p>
              </div>
            </label>
          </div>
        </Card>
      )}

      {activeView === 'notifications' && (
        <Card>
          <h3 className="font-semibold mb-4">Értesítések</h3>
          <p className="text-gray-500">Értesítési beállítások hamarosan...</p>
        </Card>
      )}

      {activeView === 'printers' && (
        <Card>
          <h3 className="font-semibold mb-4">Nyomtatók beállítása</h3>
          <p className="text-gray-500">Nyomtató konfiguráció hamarosan...</p>
        </Card>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────
   Delivery Zones Manager
────────────────────────────────────────────── */
function DeliveryZonesManager({ tenantId }: { tenantId: string }) {
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<DeliveryZone | null>(null);
  const [form, setForm] = useState({ name: '', postal_code: '', zone_type: 'city', extra_fee: '0', min_order_amount: '0' });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('delivery_zones')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('name');
    setZones((data ?? []) as DeliveryZone[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [tenantId]);

  const openNew = () => {
    setEditing(null);
    setForm({ name: '', postal_code: '', zone_type: 'city', extra_fee: '0', min_order_amount: '0' });
    setShowForm(true);
  };

  const openEdit = (z: DeliveryZone) => {
    setEditing(z);
    setForm({ name: z.name, postal_code: z.postal_code ?? '', zone_type: z.zone_type, extra_fee: String(z.extra_fee), min_order_amount: String(z.min_order_amount) });
    setShowForm(true);
  };

  // Normalise to search_key
  const toSearchKey = (s: string) =>
    s.toLowerCase()
      .replace(/á/g,'a').replace(/é/g,'e').replace(/í/g,'i')
      .replace(/ó/g,'o').replace(/ö/g,'o').replace(/ő/g,'o')
      .replace(/ú/g,'u').replace(/ü/g,'u').replace(/ű/g,'u')
      .replace(/\./g,'').replace(/\s+/g,' ').trim();

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Adj meg egy nevet!'); return; }

    const payload = {
      tenant_id: tenantId,
      name: form.name.trim(),
      search_key: toSearchKey(form.name),
      zone_type: form.zone_type,
      postal_code: form.postal_code.trim() || null,
      extra_fee: parseFloat(form.extra_fee) || 0,
      min_order_amount: parseFloat(form.min_order_amount) || 0,
      is_active: true,
    };

    if (editing) {
      const { error } = await supabase.from('delivery_zones').update(payload).eq('id', editing.id);
      if (error) { toast.error('Nem sikerült menteni'); return; }
      toast.success('Zóna frissítve');
    } else {
      const { error } = await supabase.from('delivery_zones').insert(payload);
      if (error) { toast.error('Nem sikerült létrehozni'); return; }
      toast.success('Zóna hozzáadva');
    }
    setShowForm(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Biztosan töröljük ezt a zónát?')) return;
    await supabase.from('delivery_zones').delete().eq('id', id);
    toast.success('Törölve');
    load();
  };

  const toggleActive = async (z: DeliveryZone) => {
    await supabase.from('delivery_zones').update({ is_active: !z.is_active }).eq('id', z.id);
    load();
  };

  const ZONE_TYPE_LABELS: Record<string, string> = { city: 'Város', district: 'Kerület', postal_code: 'Irányszám' };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Szállítási zónák</h3>
          <p className="text-sm text-gray-500 mt-1">
            Az itt megadott területekre szállítanak ki – ez jelenik meg a vásárlói keresőben is.
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus size={16} className="mr-2" />
          Zóna hozzáadása
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]" />
        </div>
      ) : zones.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <MapPin size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">Még nincsenek szállítási zónák</p>
            <p className="text-sm text-gray-400 mt-1">Add hozzá az első területet, ahova kiszállítotok.</p>
            <Button className="mt-4" onClick={openNew}><Plus size={14} className="mr-1" />Első zóna hozzáadása</Button>
          </div>
        </Card>
      ) : (
        <Card padding="none">
          <div className="divide-y divide-gray-100">
            {zones.map((z) => (
              <div key={z.id} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${z.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <div>
                    <p className="font-medium text-gray-900">{z.name}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <Badge variant="default" size="sm">{ZONE_TYPE_LABELS[z.zone_type] ?? z.zone_type}</Badge>
                      {z.postal_code && <span className="text-xs text-gray-500">{z.postal_code}</span>}
                      {z.extra_fee > 0 && <span className="text-xs text-amber-600">+{z.extra_fee.toLocaleString('hu-HU')} Ft pótdíj</span>}
                      {z.min_order_amount > 0 && <span className="text-xs text-gray-500">min. {z.min_order_amount.toLocaleString('hu-HU')} Ft</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleActive(z)} title={z.is_active ? 'Letiltás' : 'Engedélyezés'}
                    className={`p-1.5 rounded-lg transition-colors ${z.is_active ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}>
                    <CheckCircle size={16} />
                  </button>
                  <button onClick={() => openEdit(z)} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg">
                    <MapPin size={16} />
                  </button>
                  <button onClick={() => handleDelete(z.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editing ? 'Zóna szerkesztése' : 'Új szállítási zóna'}>
        <div className="space-y-4">
          <Input label="Terület neve *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="pl. Budapest VIII. kerület, Miskolc" />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Típus" value={form.zone_type} onChange={(e) => setForm({ ...form, zone_type: e.target.value })}
              options={[{ value: 'city', label: 'Város' }, { value: 'district', label: 'Kerület' }, { value: 'postal_code', label: 'Irányítószám' }]} />
            <Input label="Irányítószám" value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} placeholder="pl. 1081" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Pótdíj (Ft)" type="number" value={form.extra_fee} onChange={(e) => setForm({ ...form, extra_fee: e.target.value })} />
            <Input label="Min. rendelési érték (Ft)" type="number" value={form.min_order_amount} onChange={(e) => setForm({ ...form, min_order_amount: e.target.value })} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowForm(false)} className="flex-1">Mégse</Button>
            <Button onClick={handleSave} className="flex-1">{editing ? 'Mentés' : 'Hozzáadás'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
