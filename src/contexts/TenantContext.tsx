import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Tenant } from '../types';
import { supabase, tenantContext } from '../lib/supabase';

interface TenantContextValue {
  tenant: Tenant | null;
  isLoading: boolean;
  error: string | null;
  isAdmin: boolean;
  refreshTenant: () => Promise<void>;
}

const TenantCtx = createContext<TenantContextValue>({
  tenant: null,
  isLoading: true,
  error: null,
  isAdmin: false,
  refreshTenant: async () => {},
});

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTenant = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const resolved = await tenantContext.resolveTenant();

      if (!resolved) {
        setTenant(null);
        setIsLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', resolved.id)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      if (data) {
        tenantContext.setTenantId(data.id);
        setTenant(data as Tenant);
      }
    } catch (err) {
      console.error('Failed to load tenant:', err);
      setError(err instanceof Error ? err.message : 'Failed to load tenant');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTenant();
  }, [loadTenant]);

  const value: TenantContextValue = {
    tenant,
    isLoading,
    error,
    isAdmin: tenantContext.isAdminDomain(),
    refreshTenant: loadTenant,
  };

  return <TenantCtx.Provider value={value}>{children}</TenantCtx.Provider>;
}

export function useTenant() {
  const context = useContext(TenantCtx);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}
