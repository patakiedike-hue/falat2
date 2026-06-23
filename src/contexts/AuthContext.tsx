import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import type { UserProfile } from '../types';
import { supabase, tenantContext } from '../lib/supabase';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, name?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthCtx = createContext<AuthContextValue>({
  user: null,
  session: null,
  profile: null,
  isLoading: true,
  signIn: async () => ({ error: new Error('Not initialized') }),
  signUp: async () => ({ error: new Error('Not initialized') }),
  signOut: async () => {},
  isAuthenticated: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadProfile = useCallback(async (userId: string) => {
    const tenantId = tenantContext.getTenantId();

    if (!tenantId) {
      setProfile(null);
      return;
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .single();

    if (error) {
      console.error('Failed to load profile:', error);
      setProfile(null);
      return;
    }

    setProfile(data as UserProfile);
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      if (!mounted) return;
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession?.user) {
        loadProfile(currentSession.user.id);
      }
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!mounted) return;
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        await loadProfile(newSession.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }, []);

  const signUp = useCallback(async (email: string, password: string, name?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
      },
    });
    return { error };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  }, []);

  const value: AuthContextValue = {
    user,
    session,
    profile,
    isLoading,
    signIn,
    signUp,
    signOut,
    isAuthenticated: !!user && !!session,
  };

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const context = useContext(AuthCtx);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
