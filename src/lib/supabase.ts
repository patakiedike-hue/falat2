import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Tenant context management
export class TenantContext {
  private static instance: TenantContext;
  private currentTenantId: string | null = null;
  private tenants: Map<string, string> = new Map(); // hostname -> tenant_id

  private constructor() {}

  static getInstance(): TenantContext {
    if (!TenantContext.instance) {
      TenantContext.instance = new TenantContext();
    }
    return TenantContext.instance;
  }

  setTenantId(id: string) {
    this.currentTenantId = id;
  }

  getTenantId(): string | null {
    return this.currentTenantId;
  }

  getHostname(): string {
    if (typeof window === 'undefined') return 'localhost';
    return window.location.hostname;
  }

  isAdminDomain(): boolean {
    const hostname = this.getHostname();
    return hostname === 'admin.localhost' ||
           hostname.startsWith('admin.') ||
           hostname === 'admin.falathaz.hu';
  }

  isPlatformAdmin(): boolean {
    const hostname = this.getHostname();
    return hostname === 'admin.falathaz.hu' ||
           hostname === 'admin.localhost' ||
           hostname === 'localhost' && this.currentTenantId === null;
  }

  async resolveTenant(): Promise<{ id: string; name: string } | null> {
    const hostname = this.getHostname();

    // Check cache first
    const cachedId = this.tenants.get(hostname);
    if (cachedId) {
      this.currentTenantId = cachedId;
      return { id: cachedId, name: '' };
    }

    // Skip tenant resolution for admin/landing pages
    if (this.isPlatformAdmin()) {
      return null;
    }

    // Extract tenant from hostname
    // pos.falathaz.hu -> falathaz
    // pos2.falathaz.hu -> pos2
    // localhost:5173 -> check for tenant param
    const subdomain = hostname.split('.')[0];

    // For localhost, check URL params or use test tenant
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      const params = new URLSearchParams(window.location.search);
      const tenantParam = params.get('tenant');

      // Use test tenant ID for development on localhost
      const testTenantId = 'd3b07384-113e-4d92-a123-4567890abcde';

      if (tenantParam) {
        this.currentTenantId = tenantParam;
        return { id: tenantParam, name: '' };
      }

      // Default to test tenant for development
      this.currentTenantId = testTenantId;
      return { id: testTenantId, name: 'Falamat Ház' };
    }

    // Query database for tenant
    const { data, error } = await supabase
      .rpc('get_tenant_by_domain', { p_domain: subdomain })
      .single();

    if (error || !data) {
      console.warn('Tenant not found for hostname:', hostname);
      return null;
    }

    this.currentTenantId = data.id;
    this.tenants.set(hostname, data.id);

    return {
      id: data.id,
      name: data.name,
    };
  }
}

export const tenantContext = TenantContext.getInstance();
