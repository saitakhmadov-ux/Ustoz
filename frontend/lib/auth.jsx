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

  // Serverdan kelgan token va foydalanuvchini seansga o'rnatish
  const applySession = (res) => {
    setToken(res.token);
    setUser(res.user);
    return res.user;
  };

  // Kirish
  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password }, { auth: false });
    return applySession(res);
  };

  // Ro'yxatdan o'tish — token BERMAYDI. Avval email tasdiqlanishi kerak,
  // shuning uchun javobda { needsVerification, email } qaytadi.
  const register = async (payload) => {
    return api.post('/auth/register', payload, { auth: false });
  };

  // Emailga kelgan kodni tasdiqlash — shu yerda seans boshlanadi
  const verifyEmail = async (email, code) => {
    const res = await api.post('/auth/verify-email', { email, code }, { auth: false });
    return applySession(res);
  };

  // Parolni tiklash: yangi parol o'rnatilgach darhol kiritamiz
  const resetPassword = async (payload) => {
    const res = await api.post('/auth/reset-password', payload, { auth: false });
    return applySession(res);
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
    verifyEmail,
    resetPassword,
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
