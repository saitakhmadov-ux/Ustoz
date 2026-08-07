'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import AuthShell from '@/components/AuthShell';

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ fullName: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) {
      setError('Parol kamida 6 belgidan iborat bo\'lsin');
      return;
    }
    setLoading(true);
    try {
      await register(form.fullName, form.email, form.password);
      router.push('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Ro'yxatdan o'tish"
      subtitle="Bepul hisob yarating va o'rganishni boshlang"
      footer={
        <p className="mt-4 text-center text-sm text-muted">
          Hisobingiz bormi?{' '}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Kiring
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="card p-6 md:p-8">
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
        </div>

        <div className="mb-6">
          <label className="label" htmlFor="password">Parol</label>
          <input
            id="password"
            type="password"
            className="input"
            placeholder="Kamida 6 belgi"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
        </div>

        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : null}
          {loading ? 'Yaratilmoqda...' : 'Ro\'yxatdan o\'tish'}
        </button>
      </form>
    </AuthShell>
  );
}
