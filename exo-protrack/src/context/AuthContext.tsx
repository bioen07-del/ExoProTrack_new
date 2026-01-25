import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

export type UserRole = 'Production' | 'QC' | 'QA' | 'Admin' | 'Manager';

interface AppUser {
  user_id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  is_active: boolean;
  auth_user_id: string | null;
}

interface AuthContextType {
  user: AppUser | null;
  authUserId: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setAuthUserId(session.user.id);
        loadAppUser(session.user.id);
      } else {
        setUser(null);
        setAuthUserId(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function checkUser() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setAuthUserId(session.user.id);
        await loadAppUser(session.user.id);
      }
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadAppUser(authId: string, email?: string) {
    const { data: appUser } = await supabase
      .from('app_user')
      .select('*')
      .eq('auth_user_id', authId)
      .single();
    
    if (appUser) {
      setUser(appUser as AppUser);
    } else if (email) {
      // Auto-create app_user for test accounts
      const testRoles: Record<string, UserRole> = {
        'admin@exoprotrack.test': 'Admin',
        'production@exoprotrack.test': 'Production',
        'qc@exoprotrack.test': 'QC',
        'qa@exoprotrack.test': 'QA',
        'manager@exoprotrack.test': 'Manager',
      };
      
      const role = testRoles[email] || 'Production';
      const fullName = email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1);
      
      const { data: newUser, error } = await supabase.from('app_user').insert({
        auth_user_id: authId,
        email: email,
        full_name: fullName,
        role: role,
        is_active: true,
      }).select().single();
      
      if (newUser && !error) {
        setUser(newUser as AppUser);
      }
    }
  }

  async function login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    
    if (data.user) {
      setAuthUserId(data.user.id);
      await loadAppUser(data.user.id, email);
    }
  }

  async function register(email: string, password: string, fullName: string) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    
    if (data.user) {
      // Create app_user record with default role Production
      const { error: insertError } = await supabase.from('app_user').insert({
        auth_user_id: data.user.id,
        email: email,
        full_name: fullName,
        role: 'Production',
        is_active: true,
      });
      
      if (insertError) throw insertError;
      
      setAuthUserId(data.user.id);
      await loadAppUser(data.user.id);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    setUser(null);
    setAuthUserId(null);
  }

  function hasRole(roles: UserRole[]): boolean {
    if (!user) return false;
    return roles.includes(user.role);
  }

  return (
    <AuthContext.Provider value={{ user, authUserId, loading, login, register, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
