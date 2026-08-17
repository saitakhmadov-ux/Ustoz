'use client';

// Parolni tiklashning ikkinchi qadami: kod + yangi parol.
// Muvaffaqiyatli boʻlsa foydalanuvchi darhol tizimga kiradi.

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import AuthShell from '@/components/AuthShell';
import { CodeInput, useResendTimer, useQueryParam } from '@/components/auth-bits';

export default function ResetPasswordPage() {
  const { resetPassword } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useQueryParam('email');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const timer = useResendTimer(60);

  const passwordOk = password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setInfo('');
    if (!passwordOk) {
      setError('Parol kamida 8 belgi boʻlsin va harf ham, raqam ham boʻlsin');
      return;
    }
    setLoading(true);
    try {
      const user = await resetPassword({ email, code, password });
      router.push(user.role === 'ADMIN' ? '/admin' : '/dashboard');
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  // Kod kelmasa yoki muddati oʻtsa — qaytadan soʻrash
  const resend = async () => {
    setError(''); setInfo('');
    setResending(true);
    try {
      const res = await api.post('/auth/forgot-password', { email, formMs: 5000 }, { auth: false });
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
      title="Yangi parol"
      subtitle="Emailingizga kelgan kodni kiriting va yangi parol oʻrnating"
      footer={
        <p className="mt-4 text-center text-sm text-muted">
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Kirish sahifasiga qaytish
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

        <div className="mb-4">
          <label className="label" htmlFor="code">Tiklash kodi</label>
          <CodeInput value={code} onChange={setCode} autoFocus />
        </div>

        <div className="mb-6">
          <label className="label" htmlFor="password">Yangi parol</label>
          <input
            id="password"
            type="password"
            className="input"
            placeholder="Kamida 8 belgi, harf va raqam"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {password && !passwordOk && (
            <p className="mt-1 text-xs text-amber-700">
              Parol kamida 8 belgi boʻlsin va harf ham, raqam ham boʻlsin.
            </p>
          )}
        </div>

        <button type="submit" className="btn-primary w-full" disabled={loading || code.length !== 6}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
          {loading ? 'Saqlanmoqda...' : 'Parolni yangilash'}
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
      </form>
    </AuthShell>
  );
}
