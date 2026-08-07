'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, setToken, clearToken } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sahifa yuklanganda joriy foydalanuvchini olish
  const loadUser = useCallback(async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('ustoz_token') : null;
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const res = await api.get('/auth/me');
      setUser(res.user);
    } catch {
      clearToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  // Kirish
  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password }, { auth: false });
    setToken(res.token);
    setUser(res.user);
    return res.user;
  };

  // Ro'yxatdan o'tish
  const register = async (fullName, email, password) => {
    const res = await api.post('/auth/register', { fullName, email, password }, { auth: false });
    setToken(res.token);
    setUser(res.user);
    return res.user;
  };

  // Chiqish
  const logout = () => {
    clearToken();
    setUser(null);
  };

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'ADMIN',
    isInstructor: user?.role === 'INSTRUCTOR',
    // Xodim = bosh admin yoki ustoz admin (admin panelga kira oladi)
    isStaff: user?.role === 'ADMIN' || user?.role === 'INSTRUCTOR',
    login,
    register,
    logout,
    refresh: loadUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth AuthProvider ichida ishlatilishi kerak');
  return ctx;
}
