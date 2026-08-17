'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, setToken, clearToken } from './api';

const AuthContext = createContext(null);

// Tasdiqlash kaliti (pendingToken) — roʻyxatdan oʻtganda yoki tasdiqlanmagan
// hisob bilan kirganda serverdan keladi. U bilan Telegram orqali tasdiqlash
// havolasi olinadi. sessionStorage: faqat shu oyna uchun, yopilsa yoʻqoladi.
const PENDING_KEY = 'ustoz_pending_verify';

export function savePendingToken(email, token) {
  if (typeof window === 'undefined' || !token) return;
  sessionStorage.setItem(PENDING_KEY, JSON.stringify({ email, token }));
}

// Faqat oʻsha emailga tegishli boʻlsa qaytaradi — boshqa hisobga aralashmasin
export function readPendingToken(email) {
  if (typeof window === 'undefined') return null;
  try {
    const saved = JSON.parse(sessionStorage.getItem(PENDING_KEY) || 'null');
    if (saved?.token && (!email || saved.email === email)) return saved.token;
  } catch { /* buzilgan qiymat — eʼtiborsiz */ }
  return null;
}

export function clearPendingToken() {
  if (typeof window !== 'undefined') sessionStorage.removeItem(PENDING_KEY);
}

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

  // Serverdan kelgan token va foydalanuvchini seansga oʻrnatish
  const applySession = (res) => {
    setToken(res.token);
    setUser(res.user);
    return res.user;
  };

  // Kirish
  const login = async (email, password) => {
    try {
      const res = await api.post('/auth/login', { email, password }, { auth: false });
      clearPendingToken();
      return applySession(res);
    } catch (err) {
      // Parol toʻgʻri, ammo hisob tasdiqlanmagan — server tasdiqlash kalitini
      // ham qaytaradi, shuni saqlab qoʻyamiz (Telegram orqali tasdiqlash uchun)
      if (err.code === 'EMAIL_NOT_VERIFIED' && err.data?.pendingToken) {
        savePendingToken(err.data.email || email, err.data.pendingToken);
      }
      throw err;
    }
  };

  // Roʻyxatdan oʻtish — token BERMAYDI. Avval hisob tasdiqlanishi kerak,
  // shuning uchun javobda { needsVerification, email, pendingToken } qaytadi.
  const register = async (payload) => {
    const res = await api.post('/auth/register', payload, { auth: false });
    savePendingToken(res.email || payload.email, res.pendingToken);
    return res;
  };

  // Emailga kelgan kodni tasdiqlash — shu yerda seans boshlanadi
  const verifyEmail = async (email, code) => {
    const res = await api.post('/auth/verify-email', { email, code }, { auth: false });
    clearPendingToken();
    return applySession(res);
  };

  // Telegram orqali tasdiqlanganda ham seans shu koʻrinishda boshlanadi
  const applyAuthResponse = (res) => {
    clearPendingToken();
    return applySession(res);
  };

  // Parolni tiklash: yangi parol oʻrnatilgach darhol kiritamiz
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
    applyAuthResponse,
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
