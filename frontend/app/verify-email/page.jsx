'use client';

// Ro'yxatdan o'tgandan keyingi qadam: emailga kelgan 6 xonali kodni kiritish.
// Kod to'g'ri bo'lsa seans shu yerda boshlanadi.
//
// Ikkinchi yo'l — Telegram (TelegramVerify): botda "Start" bosilsa hisob
// tasdiqlanadi va sahifa o'zi kirib ketadi. Email kelmasa shu yo'l qoladi.

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2, MailCheck } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth, readPendingToken } from '@/lib/auth';
import AuthShell from '@/components/AuthShell';
import TelegramVerify from '@/components/TelegramVerify';
import { CodeInput, useResendTimer, useQueryParam } from '@/components/auth-bits';

export default function VerifyEmailPage() {
  const { verifyEmail, applyAuthResponse } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useQueryParam('email');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [pendingToken, setPendingToken] = useState(null);
  const timer = useResendTimer(60);

  // Tasdiqlash kaliti sessionStorage da (ro'yxatdan o'tish yoki kirish paytida
  // saqlangan). Bo'lmasa Telegram yo'li ko'rsatilmaydi — faqat email kodi.
  useEffect(() => {
    setPendingToken(readPendingToken(email));
  }, [email]);

  const finish = (res) => {
    const user = applyAuthResponse(res);
    router.push(user.role === 'ADMIN' ? '/admin' : '/dashboard');
  };

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setInfo('');
    setLoading(true);
    try {
      const user = await verifyEmail(email, code);
      router.push(user.role === 'ADMIN' ? '/admin' : '/dashboard');
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const resend = async () => {
    setError(''); setInfo('');
    setResending(true);
    try {
      const res = await api.post('/auth/resend-code', { email }, { auth: false });
      setInfo(res.message);
      timer.start();
    } catch (err) {
      setError(err.message);
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthShell
      title="Emailingizni tasdiqlang"
      subtitle="Pochtangizga yuborilgan 6 xonali kodni kiriting"
      footer={
        <p className="mt-4 text-center text-sm text-muted">
          Boshqa email bilan{' '}
          <Link href="/register" className="font-semibold text-primary hover:underline">
            ro'yxatdan o'tish
          </Link>
        </p>
      }
    >
      <form onSubmit={submit} className="card p-6 md:p-8">
        {error && (
          <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</div>
        )}
        {info && (
          <div className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{info}</div>
        )}

        <div className="mb-4">
          <label className="label" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="mb-6">
          <label className="label" htmlFor="code">Tasdiqlash kodi</label>
          <CodeInput value={code} onChange={setCode} autoFocus />
          <p className="mt-1.5 text-xs text-muted">Kod 10 daqiqa amal qiladi.</p>
        </div>

        <button type="submit" className="btn-primary w-full" disabled={loading || code.length !== 6}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : <MailCheck size={16} />}
          {loading ? 'Tekshirilmoqda...' : 'Tasdiqlash'}
        </button>

        <button
          type="button"
          onClick={resend}
          disabled={resending || !timer.ready || !email}
          className="btn-ghost mt-3 w-full disabled:opacity-50"
        >
          {resending && <Loader2 size={15} className="animate-spin" />}
          {timer.ready ? 'Kodni qayta yuborish' : `Qayta yuborish (${timer.left} s)`}
        </button>

        {pendingToken && (
          <TelegramVerify pendingToken={pendingToken} onDone={finish} />
        )}
      </form>
    </AuthShell>
  );
}
