"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Admin, AuthState } from '@/types';
import { API_ENDPOINTS } from '@/config/api';

interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    admin: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // Check for existing authentication on mount
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('adminToken');
      const storedAdmin = localStorage.getItem('admin');

      if (token && storedAdmin) {
        try {
          const admin = JSON.parse(storedAdmin) as Admin;
          setAuthState({
            admin,
            token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch {
          clearAuth();
        }
      } else {
        setAuthState(prev => ({ ...prev, isLoading: false }));
      }
    };

    checkAuth();
  }, []);

  const clearAuth = useCallback(() => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('admin');
    setAuthState({
      admin: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
  }, []);

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    // First, try backend API
    try {
      const response = await fetch(API_ENDPOINTS.admin.login, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Backend login successful
        localStorage.setItem('adminToken', data.token);
        localStorage.setItem('admin', JSON.stringify(data.admin));

        setAuthState({
          admin: data.admin,
          token: data.token,
          isAuthenticated: true,
          isLoading: false,
        });

        return { success: true };
      }
      
      // Backend returned an error response
      if (!response.ok || !data.success) {
        // Check if we should fall back to local auth
        const localUsername = process.env.NEXT_PUBLIC_ADMIN_USERNAME;
        const localPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;

        if (localUsername && localPassword && username === localUsername && password === localPassword) {
          // Fall back to local authentication
          const adminData = { username, role: 'admin' as const };
          const fakeToken = 'local-admin-token-' + Date.now();
          
          localStorage.setItem('adminToken', fakeToken);
          localStorage.setItem('admin', JSON.stringify(adminData));

          setAuthState({
            admin: adminData,
            token: fakeToken,
            isAuthenticated: true,
            isLoading: false,
          });

          return { success: true };
        }

        return { success: false, error: data.message || 'Invalid credentials' };
      }
    } catch (error) {
      console.error('Backend login error:', error);
      
      // Fall back to local auth if backend is unavailable
      const localUsername = process.env.NEXT_PUBLIC_ADMIN_USERNAME;
      const localPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;

      if (localUsername && localPassword && username === localUsername && password === localPassword) {
        const adminData = { username, role: 'admin' as const };
        const fakeToken = 'local-admin-token-' + Date.now();
        
        localStorage.setItem('adminToken', fakeToken);
        localStorage.setItem('admin', JSON.stringify(adminData));

        setAuthState({
          admin: adminData,
          token: fakeToken,
          isAuthenticated: true,
          isLoading: false,
        });

        return { success: true };
      }

      return { success: false, error: 'Network error. Please try again.' };
    }

    return { success: false, error: 'Login failed' };
  };

  const logout = useCallback(() => {
    clearAuth();
  }, [clearAuth]);

  return (
    <AuthContext.Provider value={{ ...authState, login, logout }}>
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
