'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import AuthShell from '@/components/AuthShell';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      router.push(user.role === 'ADMIN' ? '/admin' : '/dashboard');
    } catch (err) {
      // Parol toʻgʻri, ammo email tasdiqlanmagan — tasdiqlash sahifasiga oʻtamiz
      if (err.code === 'EMAIL_NOT_VERIFIED') {
        router.push(`/verify-email?email=${encodeURIComponent(form.email)}`);
        return;
      }
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Tizimga kirish"
      subtitle="Hisobingizga kiring va oʻrganishni davom ettiring"
      footer={
        <p className="mt-4 text-center text-sm text-muted">
          Hisobingiz yoʻqmi?{' '}
          <Link href="/register" className="font-semibold text-primary hover:underline">
            Roʻyxatdan oʻting
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="card p-6 md:p-8">
        {error && (
          <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</div>
        )}

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
        </div>

        <div className="mb-6">
          <div className="flex items-baseline justify-between gap-2">
            <label className="label" htmlFor="password">Parol</label>
            <Link
              href={`/forgot-password${form.email ? `?email=${encodeURIComponent(form.email)}` : ''}`}
              className="text-xs font-medium text-primary hover:underline"
            >
              Parolni unutdingizmi?
            </Link>
          </div>
          <input
            id="password"
            type="password"
            className="input"
            placeholder="••••••••"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
        </div>

        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : null}
          {loading ? 'Kirilmoqda...' : 'Kirish'}
        </button>
      </form>
    </AuthShell>
  );
}
