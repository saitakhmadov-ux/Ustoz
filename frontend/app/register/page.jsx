'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import AuthShell from '@/components/AuthShell';
import BotShield, { useBotShield } from '@/components/BotShield';

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const shield = useBotShield();
  const [form, setForm] = useState({ fullName: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Backenddagi qoida bilan bir xil: 8 belgi, harf va raqam
  const passwordOk = form.password.length >= 8
    && /[A-Za-z]/.test(form.password)
    && /\d/.test(form.password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!passwordOk) {
      setError('Parol kamida 8 belgi boʻlsin va harf ham, raqam ham boʻlsin');
      return;
    }
    setLoading(true);
    try {
      const res = await register({ ...form, ...shield.fields() });
      // Token berilmaydi — email tasdiqlash sahifasiga oʻtamiz
      router.push(`/verify-email?email=${encodeURIComponent(res.email || form.email)}`);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Roʻyxatdan oʻtish"
      subtitle="Bepul hisob yarating va oʻrganishni boshlang"
      footer={
        <p className="mt-4 text-center text-sm text-muted">
          Hisobingiz bormi?{' '}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Kiring
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="card relative p-6 md:p-8">
        {error && (
          <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</div>
        )}

        <div className="mb-4">
          <label className="label" htmlFor="fullName">Ism-familiya</label>
          <input
            id="fullName"
            type="text"
            className="input"
            placeholder="Ism Familiya"
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            required
          />
        </div>

        <div className="mb-4">
          <label className="label" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            className="input"
            placeholder="siz@example.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <p className="mt-1 text-xs text-muted">
            Tasdiqlash kodi shu manzilga yuboriladi — haqiqiy emailingizni kiriting.
          </p>
        </div>

        <div className="mb-6">
          <label className="label" htmlFor="password">Parol</label>
          <input
            id="password"
            type="password"
            className="input"
            placeholder="Kamida 8 belgi, harf va raqam"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
          {form.password && !passwordOk && (
            <p className="mt-1 text-xs text-amber-700">
              Parol kamida 8 belgi boʻlsin va harf ham, raqam ham boʻlsin.
            </p>
          )}
        </div>

        <BotShield shield={shield} />

        <button type="submit" className="btn-primary w-full" disabled={loading || !shield.ready}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : null}
          {loading ? 'Yaratilmoqda...' : 'Roʻyxatdan oʻtish'}
        </button>

        {!shield.ready && (
          <p className="mt-2 text-center text-xs text-muted">Tekshiruvni kuting...</p>
        )}

        <p className="mt-4 flex items-start gap-1.5 text-xs text-muted">
          <ShieldCheck size={14} className="mt-px shrink-0" />
          Hisob emailingiz tasdiqlangandan keyin faollashadi.
        </p>
      </form>
    </AuthShell>
  );
}
