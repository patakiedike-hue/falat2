import React, { createContext, useContext, useMemo, useEffect } from 'react';
import { useTenant } from './TenantContext';

interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  border: string;
  success: string;
  warning: string;
  error: string;
}

interface ThemeContextValue {
  colors: ThemeColors;
  tenantName: string;
  logoUrl: string | null;
}

const defaultColors: ThemeColors = {
  primary: '#3B82F6',
  secondary: '#10B981',
  accent: '#F59E0B',
  background: '#F9FAFB',
  surface: '#FFFFFF',
  text: '#111827',
  textMuted: '#6B7280',
  border: '#E5E7EB',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
};

const ThemeCtx = createContext<ThemeContextValue>({
  colors: defaultColors,
  tenantName: '',
  logoUrl: null,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { tenant } = useTenant();

  const colors = useMemo<ThemeColors>(() => {
    if (!tenant) {
      return defaultColors;
    }

    return {
      primary: tenant.primary_color || defaultColors.primary,
      secondary: tenant.secondary_color || defaultColors.secondary,
      accent: tenant.accent_color || defaultColors.accent,
      background: defaultColors.background,
      surface: defaultColors.surface,
      text: defaultColors.text,
      textMuted: defaultColors.textMuted,
      border: defaultColors.border,
      success: defaultColors.success,
      warning: defaultColors.warning,
      error: defaultColors.error,
    };
  }, [tenant]);

  useEffect(() => {
    const root = document.documentElement;

    root.style.setProperty('--color-primary', colors.primary);
    root.style.setProperty('--color-secondary', colors.secondary);
    root.style.setProperty('--color-accent', colors.accent);
    root.style.setProperty('--color-primary-50', `${colors.primary}10`);
    root.style.setProperty('--color-primary-100', `${colors.primary}20`);
    root.style.setProperty('--color-primary-500', colors.primary);
    root.style.setProperty('--color-primary-600', `${colors.primary}cc`);
    root.style.setProperty('--color-primary-700', `${colors.primary}99`);

    if (tenant?.logo_url) {
      const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
      if (link) {
        link.href = tenant.logo_url;
      }
    }

    if (tenant?.name) {
      document.title = tenant.name;
    }
  }, [colors, tenant]);

  const value: ThemeContextValue = {
    colors,
    tenantName: tenant?.name || '',
    logoUrl: tenant?.logo_url || null,
  };

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeCtx);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
