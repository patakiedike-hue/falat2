import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Tenant } from '../types';
import {
  Search, MapPin, ChevronRight, Clock, Truck, Star,
  UtensilsCrossed, Flame, CheckCircle2, XCircle, ArrowRight,
  SlidersHorizontal, X, ChevronDown, Phone, Globe
} from 'lucide-react';

interface DeliveryZone {
  id: string;
  tenant_id: string;
  name: string;
  search_key: string;
  zone_type: string;
  postal_code: string | null;
  extra_fee: number;
  min_order_amount: number;
}

interface RestaurantWithZones extends Tenant {
  delivery_zones: DeliveryZone[];
  delivers_to_search?: boolean;
}

// Hungarian diacritics normalisation for fuzzy matching
function normalise(str: string): string {
  return str
    .toLowerCase()
    .replace(/á/g, 'a').replace(/é/g, 'e').replace(/í/g, 'i')
    .replace(/ó/g, 'o').replace(/ö/g, 'o').replace(/ő/g, 'o')
    .replace(/ú/g, 'u').replace(/ü/g, 'u').replace(/ű/g, 'u')
    .replace(/\./g, '').replace(/\s+/g, ' ').trim();
}

const PEXELS_FOOD = [
  'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?w=600&h=400&fit=crop',
  'https://images.pexels.com/photos/70497/pexels-photo-70497.jpeg?w=600&h=400&fit=crop',
  'https://images.pexels.com/photos/1199957/pexels-photo-1199957.jpeg?w=600&h=400&fit=crop',
  'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?w=600&h=400&fit=crop',
  'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?w=600&h=400&fit=crop',
  'https://images.pexels.com/photos/2097090/pexels-photo-2097090.jpeg?w=600&h=400&fit=crop',
];

function getRestaurantImage(index: number) {
  return PEXELS_FOOD[index % PEXELS_FOOD.length];
}

const CUISINE_TAGS = ['Pizza', 'Burger', 'Kebab', 'Ázsiai', 'Magyar', 'Szusi', 'Gyros', 'Reggeli'];

export function DiscoveryPage() {
  const [restaurants, setRestaurants] = useState<RestaurantWithZones[]>([]);
  const [filtered, setFiltered] = useState<RestaurantWithZones[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [addressQuery, setAddressQuery] = useState('');
  const [confirmedAddress, setConfirmedAddress] = useState('');
  const [suggestions, setSuggestions] = useState<DeliveryZone[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [allZones, setAllZones] = useState<DeliveryZone[]>([]);

  const [viewMode, setViewMode] = useState<'search' | 'all'>('search');
  const [activeCuisine, setActiveCuisine] = useState<string | null>(null);
  const [searchInitiated, setSearchInitiated] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const suggestRef = useRef<HTMLDivElement>(null);

  /* ---- load data ---- */
  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setIsLoading(true);
    const [restRes, zonesRes] = await Promise.all([
      supabase
        .from('tenants')
        .select('*')
        .eq('is_active', true)
        .in('license_status', ['active', 'trial'])
        .order('name'),
      supabase.from('delivery_zones').select('*').eq('is_active', true),
    ]);

    const rests = (restRes.data ?? []) as Tenant[];
    const zones = (zonesRes.data ?? []) as DeliveryZone[];
    setAllZones(zones);

    const merged: RestaurantWithZones[] = rests.map((r) => ({
      ...r,
      delivery_zones: zones.filter((z) => z.tenant_id === r.id),
    }));

    setRestaurants(merged);
    setFiltered(merged);
    setIsLoading(false);
  };

  /* ---- address suggestions ---- */
  useEffect(() => {
    if (addressQuery.trim().length < 2) { setSuggestions([]); return; }
    const norm = normalise(addressQuery);
    const hits = allZones.filter(
      (z) => normalise(z.name).includes(norm) || normalise(z.search_key).includes(norm) || (z.postal_code && z.postal_code.startsWith(addressQuery.trim()))
    );
    // Deduplicate by name
    const seen = new Set<string>();
    setSuggestions(hits.filter((z) => { if (seen.has(z.name)) return false; seen.add(z.name); return true; }).slice(0, 8));
    setShowSuggestions(true);
  }, [addressQuery, allZones]);

  /* ---- close suggestions on outside click ---- */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (suggestRef.current && !suggestRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* ---- filter restaurants ---- */
  const runSearch = useCallback((addr: string) => {
    if (!addr.trim()) { setFiltered(restaurants); return; }
    const norm = normalise(addr);
    const result = restaurants.map((r) => {
      const delivers = r.delivery_zones.some(
        (z) => normalise(z.name).includes(norm) || normalise(z.search_key).includes(norm) || (z.postal_code && z.postal_code.startsWith(addr.trim()))
      );
      return { ...r, delivers_to_search: delivers };
    });
    // Sort: delivering first
    result.sort((a, b) => Number(b.delivers_to_search) - Number(a.delivers_to_search));
    setFiltered(result);
  }, [restaurants]);

  const handleSelectSuggestion = (zone: DeliveryZone) => {
    setAddressQuery(zone.name);
    setConfirmedAddress(zone.name);
    setShowSuggestions(false);
    setSearchInitiated(true);
    setViewMode('search');
    runSearch(zone.name);
  };

  const handleManualSearch = () => {
    if (!addressQuery.trim()) return;
    setConfirmedAddress(addressQuery);
    setShowSuggestions(false);
    setSearchInitiated(true);
    setViewMode('search');
    runSearch(addressQuery);
  };

  const handleBrowseAll = () => {
    setViewMode('all');
    setConfirmedAddress('');
    setSearchInitiated(false);
    setFiltered(restaurants);
  };

  const clearSearch = () => {
    setAddressQuery('');
    setConfirmedAddress('');
    setSearchInitiated(false);
    setFiltered(restaurants);
    inputRef.current?.focus();
  };

  const displayList = viewMode === 'all' ? restaurants : filtered;
  const deliversCount = filtered.filter((r) => r.delivers_to_search).length;

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white font-sans">

      {/* ── HERO ── */}
      <section className="relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0">
          <img
            src="https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?w=1600&h=900&fit=crop"
            alt=""
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-[#0d0d0d]/70 to-[#0d0d0d]" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-4 pt-16 pb-20 text-center">
          {/* Tagline */}
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-sm text-amber-400 font-medium mb-6 backdrop-blur-sm">
            <Flame size={14} />
            Friss ételek, gyors kiszállítás
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold leading-tight mb-4">
            Rendelj<br />
            <span className="text-amber-400">helyi</span> éttermektől
          </h1>
          <p className="text-lg text-gray-300 mb-10 max-w-xl mx-auto">
            Találd meg, melyik étterem szállít a te területedre – egyetlen kereséssel.
          </p>

          {/* ── Search Box ── */}
          <div className="max-w-2xl mx-auto" ref={suggestRef}>
            <div className="relative flex bg-white rounded-2xl overflow-visible shadow-2xl">
              <div className="flex items-center pl-5 text-gray-400">
                <MapPin size={22} />
              </div>
              <input
                ref={inputRef}
                type="text"
                value={addressQuery}
                onChange={(e) => setAddressQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleManualSearch()}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                placeholder="Írd be a városod, kerületed vagy irányítószámodat…"
                className="flex-1 py-5 px-4 text-gray-900 text-base focus:outline-none bg-transparent placeholder-gray-400"
              />
              {addressQuery && (
                <button onClick={clearSearch} className="flex items-center pr-2 text-gray-400 hover:text-gray-700">
                  <X size={18} />
                </button>
              )}
              <button
                onClick={handleManualSearch}
                className="m-2 bg-amber-500 hover:bg-amber-400 text-black font-bold px-6 py-3 rounded-xl flex items-center gap-2 transition-colors shrink-0"
              >
                <Search size={18} />
                Keresés
              </button>

              {/* Suggestions dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50">
                  {suggestions.map((z) => (
                    <button
                      key={z.id}
                      onClick={() => handleSelectSuggestion(z)}
                      className="w-full flex items-center gap-3 px-5 py-3 hover:bg-amber-50 text-left transition-colors"
                    >
                      <MapPin size={16} className="text-amber-500 shrink-0" />
                      <div>
                        <p className="text-gray-900 font-medium">{z.name}</p>
                        {z.postal_code && (
                          <p className="text-xs text-gray-500">{z.postal_code}</p>
                        )}
                      </div>
                      <span className="ml-auto text-xs text-gray-400">
                        {z.zone_type === 'district' ? 'Kerület' : 'Város'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center justify-center gap-3 text-sm text-gray-400">
              <span>Vagy</span>
              <button
                onClick={handleBrowseAll}
                className="text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1 underline underline-offset-2 transition-colors"
              >
                böngéssz az összes étterem között
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── MAIN CONTENT ── */}
      <main className="max-w-6xl mx-auto px-4 pb-20">

        {/* Status bar */}
        {(searchInitiated || viewMode === 'all') && (
          <div className="flex items-center justify-between py-4 mb-2">
            <div>
              {viewMode === 'all' ? (
                <h2 className="text-xl font-bold text-white">
                  Összes étterem
                  <span className="ml-2 text-sm font-normal text-gray-400">({restaurants.length} db)</span>
                </h2>
              ) : (
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <MapPin size={18} className="text-amber-400" />
                    {confirmedAddress}
                  </h2>
                  <p className="text-sm text-gray-400 mt-1">
                    <span className="text-green-400 font-semibold">{deliversCount} étterem</span> szállít erre a területre
                  </p>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              {viewMode === 'search' && (
                <button
                  onClick={handleBrowseAll}
                  className="text-sm text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 px-4 py-2 rounded-lg transition-colors"
                >
                  Összes megtekintése
                </button>
              )}
              {viewMode === 'all' && confirmedAddress && (
                <button
                  onClick={() => { setViewMode('search'); setSearchInitiated(true); runSearch(confirmedAddress); }}
                  className="text-sm text-amber-400 hover:text-amber-300 border border-amber-500/40 px-4 py-2 rounded-lg transition-colors flex items-center gap-1"
                >
                  <MapPin size={14} /> Vissza a szűrt nézethez
                </button>
              )}
            </div>
          </div>
        )}

        {/* Cuisine chips */}
        {(searchInitiated || viewMode === 'all') && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-6 no-scrollbar">
            <button
              onClick={() => setActiveCuisine(null)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
                activeCuisine === null
                  ? 'bg-amber-500 border-amber-500 text-black'
                  : 'border-gray-700 text-gray-300 hover:border-gray-500'
              }`}
            >
              Minden kategória
            </button>
            {CUISINE_TAGS.map((tag) => (
              <button
                key={tag}
                onClick={() => setActiveCuisine(activeCuisine === tag ? null : tag)}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
                  activeCuisine === tag
                    ? 'bg-amber-500 border-amber-500 text-black'
                    : 'border-gray-700 text-gray-300 hover:border-gray-500'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {/* Hero empty state */}
        {!searchInitiated && viewMode === 'search' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
            {[
              { icon: <Search size={28} />, title: 'Keress cím alapján', desc: 'Írd be a városod vagy kerületed, és mutatjuk, ki szállít hozzád.' },
              { icon: <UtensilsCrossed size={28} />, title: 'Böngéssz szabadon', desc: 'Nézd meg az összes partnert és válaszd ki a kedvenced.' },
              { icon: <Truck size={28} />, title: 'Gyors kiszállítás', desc: 'Partnereink vállalják, hogy az ételek frissen érkeznek el hozzád.' },
            ].map((item, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
                <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl flex items-center justify-center mx-auto mb-4">
                  {item.icon}
                </div>
                <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-sm text-gray-400">{item.desc}</p>
              </div>
            ))}
          </div>
        )}

        {/* Restaurant Grid */}
        {(searchInitiated || viewMode === 'all') && (
          <>
            {isLoading ? (
              <div className="flex justify-center py-20">
                <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : displayList.length === 0 ? (
              <div className="text-center py-20">
                <UtensilsCrossed size={56} className="mx-auto text-gray-600 mb-4" />
                <h3 className="text-xl font-semibold text-gray-300">Nincs találat</h3>
                <p className="text-gray-500 mt-2">Próbálj más területet, vagy böngéssz az összes étterem között.</p>
                <button onClick={handleBrowseAll} className="mt-4 text-amber-400 underline">Összes étterem</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayList.map((rest, idx) => (
                  <RestaurantCard
                    key={rest.id}
                    restaurant={rest}
                    imageUrl={getRestaurantImage(idx)}
                    searchAddress={confirmedAddress}
                    viewMode={viewMode}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────── */
/*  Restaurant Card                                             */
/* ──────────────────────────────────────────────────────────── */

interface RestaurantCardProps {
  restaurant: RestaurantWithZones;
  imageUrl: string;
  searchAddress: string;
  viewMode: 'search' | 'all';
}

function RestaurantCard({ restaurant: r, imageUrl, searchAddress, viewMode }: RestaurantCardProps) {
  const [showDetail, setShowDetail] = useState(false);

  const delivers = r.delivers_to_search === true;
  const searched = viewMode === 'search' && searchAddress.trim() !== '';
  const zone = searched
    ? r.delivery_zones.find((z) =>
        normalise(z.name).includes(normalise(searchAddress)) ||
        normalise(z.search_key).includes(normalise(searchAddress)) ||
        (z.postal_code && z.postal_code.startsWith(searchAddress.trim()))
      )
    : null;

  return (
    <>
      <article
        onClick={() => setShowDetail(true)}
        className={`group relative bg-[#1a1a1a] rounded-2xl overflow-hidden border transition-all duration-300 cursor-pointer
          ${searched
            ? delivers
              ? 'border-green-500/40 hover:border-green-400 hover:shadow-[0_0_24px_rgba(34,197,94,0.15)]'
              : 'border-white/10 opacity-60 hover:opacity-80'
            : 'border-white/10 hover:border-amber-500/50 hover:shadow-[0_0_24px_rgba(245,158,11,0.1)]'
          }`}
      >
        {/* Cover image */}
        <div className="relative h-44 overflow-hidden">
          <img
            src={imageUrl}
            alt={r.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a1a] via-transparent to-transparent" />

          {/* Delivery badge */}
          {searched && (
            <div className={`absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold backdrop-blur-sm ${
              delivers
                ? 'bg-green-500/90 text-white'
                : 'bg-gray-800/90 text-gray-300'
            }`}>
              {delivers ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
              {delivers ? 'Szállít ide' : 'Nem szállít ide'}
            </div>
          )}

          {/* Logo */}
          {r.logo_url ? (
            <img
              src={r.logo_url}
              alt=""
              className="absolute bottom-3 left-4 w-12 h-12 rounded-xl object-cover border-2 border-white/20"
            />
          ) : (
            <div
              className="absolute bottom-3 left-4 w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl border-2 border-white/20"
              style={{ backgroundColor: r.primary_color + '99' }}
            >
              {r.name.charAt(0)}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4 pt-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-lg leading-tight">{r.name}</h3>
            <div className="flex items-center gap-1 text-amber-400 shrink-0">
              <Star size={14} fill="currentColor" />
              <span className="text-sm font-semibold">4.8</span>
            </div>
          </div>

          <p className="text-gray-500 text-sm mt-1 flex items-center gap-1">
            <MapPin size={12} />
            {r.city || r.address || 'Magyarország'}
          </p>

          <div className="flex items-center gap-4 mt-3 text-sm text-gray-400">
            <span className="flex items-center gap-1">
              <Truck size={13} />
              {r.delivery_fee === 0 ? 'Ingyenes kiszállítás' : `${r.delivery_fee.toLocaleString('hu-HU')} Ft`}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={13} />
              30–45 perc
            </span>
          </div>

          {/* Zone extra info */}
          {zone && delivers && (
            <div className="mt-3 flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2">
              <CheckCircle2 size={14} className="text-green-400 shrink-0" />
              <div className="text-xs">
                <span className="text-green-300 font-medium">{zone.name}</span>
                {zone.extra_fee > 0 && (
                  <span className="text-gray-400 ml-1">· +{zone.extra_fee.toLocaleString('hu-HU')} Ft pótdíj</span>
                )}
                {zone.min_order_amount > 0 && (
                  <span className="text-gray-400 ml-1">· min. {zone.min_order_amount.toLocaleString('hu-HU')} Ft</span>
                )}
              </div>
            </div>
          )}

          {/* Min order */}
          <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              Min. rendelés: {r.min_order_amount.toLocaleString('hu-HU')} Ft
            </span>
            <span className="text-amber-400 text-sm font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
              Megrendelés <ChevronRight size={14} />
            </span>
          </div>
        </div>
      </article>

      {/* Detail Modal */}
      {showDetail && (
        <RestaurantDetailModal
          restaurant={r}
          imageUrl={imageUrl}
          searchAddress={searchAddress}
          delivers={delivers}
          zone={zone}
          onClose={() => setShowDetail(false)}
        />
      )}
    </>
  );
}

/* ──────────────────────────────────────────────────────────── */
/*  Restaurant Detail Modal                                     */
/* ──────────────────────────────────────────────────────────── */

interface DetailProps {
  restaurant: RestaurantWithZones;
  imageUrl: string;
  searchAddress: string;
  delivers: boolean;
  zone: DeliveryZone | undefined | null;
  onClose: () => void;
}

function RestaurantDetailModal({ restaurant: r, imageUrl, searchAddress, delivers, zone, onClose }: DetailProps) {
  const searched = searchAddress.trim() !== '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#1a1a1a] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl border border-white/10 max-h-[90vh] overflow-y-auto">
        {/* Cover */}
        <div className="relative h-56">
          <img src={imageUrl} alt={r.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a1a] via-black/30 to-transparent" />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 bg-black/60 hover:bg-black rounded-full flex items-center justify-center text-white transition-colors"
          >
            <X size={18} />
          </button>
          <div className="absolute bottom-4 left-6 flex items-end gap-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-2xl border-2 border-white/30 shadow-xl"
              style={{ backgroundColor: r.primary_color + 'cc' }}
            >
              {r.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-white">{r.name}</h2>
              {r.city && <p className="text-gray-300 text-sm flex items-center gap-1"><MapPin size={12} />{r.city}</p>}
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Delivery status banner */}
          {searched && (
            <div className={`flex items-start gap-3 p-4 rounded-xl border ${
              delivers
                ? 'bg-green-500/10 border-green-500/30'
                : 'bg-red-500/10 border-red-500/30'
            }`}>
              {delivers ? (
                <CheckCircle2 size={20} className="text-green-400 shrink-0 mt-0.5" />
              ) : (
                <XCircle size={20} className="text-red-400 shrink-0 mt-0.5" />
              )}
              <div>
                {delivers ? (
                  <>
                    <p className="text-green-300 font-semibold">Jelenleg szállít erre a területre</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Az étterem szállít a(z) <span className="text-green-300 font-medium">{searchAddress}</span> területre.
                      {zone?.extra_fee ? ` Pótdíj: +${zone.extra_fee.toLocaleString('hu-HU')} Ft.` : ''}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-red-300 font-semibold">Ez az étterem sajnos nem szállít a megadott területre</p>
                    <p className="text-sm text-gray-400 mt-1">
                      A(z) <span className="text-red-300 font-medium">{searchAddress}</span> cím nem szerepel az étterem szállítási zónái között.
                    </p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Kiszállítás', value: r.delivery_fee === 0 ? 'Ingyenes' : `${r.delivery_fee.toLocaleString('hu-HU')} Ft`, icon: <Truck size={16} /> },
              { label: 'Min. rendelés', value: `${r.min_order_amount.toLocaleString('hu-HU')} Ft`, icon: <UtensilsCrossed size={16} /> },
              { label: 'Szállítási idő', value: '30–45 perc', icon: <Clock size={16} /> },
            ].map((s) => (
              <div key={s.label} className="bg-white/5 rounded-xl p-3 text-center">
                <div className="flex justify-center text-amber-400 mb-1">{s.icon}</div>
                <p className="text-white font-semibold text-sm">{s.value}</p>
                <p className="text-gray-500 text-xs">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Delivery zones */}
          <div>
            <h3 className="font-semibold text-gray-200 mb-2 flex items-center gap-2">
              <MapPin size={15} className="text-amber-400" />
              Szállítási zónák ({r.delivery_zones.length})
            </h3>
            {r.delivery_zones.length === 0 ? (
              <p className="text-sm text-gray-500">Nincs megadva szállítási zóna.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {r.delivery_zones.map((z) => (
                  <span
                    key={z.id}
                    className={`px-3 py-1 rounded-full text-xs font-medium border ${
                      zone?.id === z.id
                        ? 'bg-green-500/20 border-green-500/50 text-green-300'
                        : 'bg-white/5 border-white/10 text-gray-400'
                    }`}
                  >
                    {z.name}
                    {z.extra_fee > 0 && <span className="ml-1 opacity-70">+{z.extra_fee.toLocaleString('hu-HU')} Ft</span>}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* CTA */}
          <button
            onClick={onClose}
            disabled={searched && !delivers}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-colors ${
              searched && !delivers
                ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                : 'bg-amber-500 hover:bg-amber-400 text-black'
            }`}
          >
            {searched && !delivers ? 'Nem szállít erre a területre' : 'Étlap megtekintése & Rendelés'}
          </button>
        </div>
      </div>
    </div>
  );
}
