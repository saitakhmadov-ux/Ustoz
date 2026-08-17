'use client';

// Telegram Mini App sahifasi — botdagi "Hisobni ulash" tugmasi shu yerni
// Telegram ilovasi ichida ochadi.
//
// Nega shunday: parol BOTGA emas, saytning oʻz HTTPS formasiga kiritiladi.
// Telegram sahifaga `initData` beradi — u bot tokeni bilan imzolangan, server
// imzoni tekshiradi (backend/src/utils/telegramWebApp.js), shuning uchun
// oʻzini boshqa Telegram foydalanuvchisi qilib koʻrsatib boʻlmaydi.
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import {
  CheckCircle2, Loader2, Send, ShieldCheck, TriangleAlert,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { SITE_NAME } from '@/lib/constants';

// Sahifa holatlari
const S = {
  BOOT: 'boot', // Telegram skripti va seans kutilmoqda
  NO_TELEGRAM: 'noTelegram', // Telegram tashqarisida ochilgan
  LOGIN: 'login', // kirish formasi
  LINKING: 'linking', // soʻrov ketmoqda
  DONE: 'done',
  ERROR: 'error',
};

function tg() {
  return typeof window !== 'undefined' ? window.Telegram?.WebApp : null;
}

export default function TelegramLinkPage() {
  const { user, loading: authLoading, login } = useAuth();
  const [state, setState] = useState(S.BOOT);
  const [initData, setInitData] = useState(null); // null = hali aniqlanmagan
  const [error, setError] = useState('');
  const [form, setForm] = useState({ email: '', password: '' });
  const [busy, setBusy] = useState(false);

  // Telegram skripti yuklangach initData ni oʻqiymiz
  const readInitData = useCallback(() => {
    const wa = tg();
    if (!wa) {
      setInitData('');
      return;
    }
    wa.ready();
    wa.expand?.();
    setInitData(wa.initData || '');
  }, []);

  // Skript allaqachon yuklangan boʻlishi mumkin (qayta kirishda)
  useEffect(() => {
    if (tg()) readInitData();
    // Skript umuman kelmasa ham sahifa muzlab qolmasin
    const t = setTimeout(() => setInitData((prev) => (prev === null ? '' : prev)), 4000);
    return () => clearTimeout(t);
  }, [readInitData]);

  // Ulash soʻrovi
  const link = useCallback(async (data) => {
    setState(S.LINKING);
    setError('');
    try {
      await api.post('/me/telegram/webapp-link', { initData: data });
      setState(S.DONE);
      tg()?.HapticFeedback?.notificationOccurred?.('success');
      setTimeout(() => tg()?.close?.(), 1800);
    } catch (err) {
      setError(err.message);
      setState(S.ERROR);
    }
  }, []);

  // Holatni hisoblaymiz: initData bor -> seans bor boʻlsa ulaymiz, yoʻq boʻlsa kirish
  useEffect(() => {
    if (initData === null || authLoading) return;
    if (state !== S.BOOT) return;
    if (!initData) {
      setState(S.NO_TELEGRAM);
      return;
    }
    if (user) link(initData);
    else setState(S.LOGIN);
  }, [initData, authLoading, user, state, link]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(form.email, form.password);
      await link(initData);
    } catch (err) {
      if (err.code === 'EMAIL_NOT_VERIFIED') {
        setError('Email hali tasdiqlanmagan. Avval emailingizni tasdiqlang, soʻng qaytib ulang.');
      } else {
        setError(err.message);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Script
        src="https://telegram.org/js/telegram-web-app.js"
        strategy="afterInteractive"
        onLoad={readInitData}
      />

      <div className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center px-4 py-10">
        <div className="card p-6 md:p-8">
          <div className="mb-6 flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <Send size={20} />
            </span>
            <div>
              <h1 className="font-display text-lg font-bold">Telegramʼga ulash</h1>
              <p className="text-sm text-muted">{SITE_NAME} hisobingizni botga bogʻlash</p>
            </div>
          </div>

          {(state === S.BOOT || state === S.LINKING) && (
            <p className="flex items-center gap-2 py-6 text-sm text-muted">
              <Loader2 size={16} className="animate-spin" />
              {state === S.LINKING ? 'Ulanmoqda…' : 'Tekshirilmoqda…'}
            </p>
          )}

          {state === S.DONE && (
            <div className="py-6 text-center">
              <CheckCircle2 size={44} className="mx-auto text-emerald-500" />
              <p className="mt-3 font-semibold">Hisobingiz ulandi</p>
              <p className="mt-1 text-sm text-muted">
                Botga qaytishingiz mumkin — oyna oʻzi yopiladi.
              </p>
            </div>
          )}

          {state === S.NO_TELEGRAM && (
            <div className="py-2">
              <TriangleAlert size={28} className="text-amber-500" />
              <p className="mt-3 text-sm">
                Bu sahifa <b>Telegram ilovasi ichida</b> ochilishi kerak.
                Botni oching va <b>/ulash</b> buyrugʻini berib, "Hisobni ulash" tugmasini bosing.
              </p>
              <Link href="/profile" className="btn-primary mt-5 w-full">
                Profilga oʻtish
              </Link>
            </div>
          )}

          {state === S.LOGIN && (
            <form onSubmit={handleLogin}>
              <p className="mb-4 text-sm text-muted">
                Ulash uchun hisobingizga kiring. Faqat roʻyxatdan oʻtganlar ulay oladi.
              </p>

              {error && (
                <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                  {error}
                </div>
              )}

              <div className="mb-4">
                <label className="label" htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  className="input"
                  placeholder="siz@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>

              <div className="mb-5">
                <label className="label" htmlFor="password">Parol</label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  className="input"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
              </div>

              <button type="submit" className="btn-primary w-full" disabled={busy}>
                {busy ? <Loader2 size={16} className="animate-spin" /> : null}
                {busy ? 'Kirilmoqda…' : 'Kirish va ulash'}
              </button>

              <p className="mt-4 flex items-start gap-2 text-xs text-muted">
                <ShieldCheck size={14} className="mt-0.5 shrink-0 text-emerald-600" />
                Parolingiz botga emas, {SITE_NAME} saytining oʻziga yuboriladi.
                Bot hech qachon parol soʻramaydi.
              </p>

              <p className="mt-4 text-center text-sm text-muted">
                Hisobingiz yoʻqmi?{' '}
                <Link href="/register" className="font-semibold text-primary hover:underline">
                  Roʻyxatdan oʻting
                </Link>
              </p>
            </form>
          )}

          {state === S.ERROR && (
            <div className="py-2">
              <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                {error}
              </div>
              <button
                type="button"
                className="btn-primary mt-5 w-full"
                onClick={() => (user ? link(initData) : setState(S.LOGIN))}
              >
                Qayta urinish
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
