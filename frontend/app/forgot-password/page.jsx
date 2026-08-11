'use client';

// Parolni tiklashning birinchi qadami: emailga kod so'rash.
// Javob har doim bir xil — qaysi email ro'yxatda borligi oshkor qilinmaydi.

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Loader2, KeyRound } from 'lucide-react';
import { api } from '@/lib/api';
import AuthShell from '@/components/AuthShell';
import BotShield, { useBotShield } from '@/components/BotShield';
import { useQueryParam } from '@/components/auth-bits';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const shield = useBotShield();
  const [email, setEmail] = useQueryParam('email');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email, ...shield.fields() }, { auth: false });
      router.push(`/reset-password?email=${encodeURIComponent(email)}`);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Parolni tiklash"
      subtitle="Email manzilingizni kiriting — tiklash kodini yuboramiz"
      footer={
        <p className="mt-4 text-center text-sm text-muted">
          Parolingiz esingizga tushdimi?{' '}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Kirish
          </Link>
        </p>
      }
    >
      <form onSubmit={submit} className="card relative p-6 md:p-8">
        {error && (
          <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</div>
        )}

        <div className="mb-6">
          <label className="label" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            className="input"
            placeholder="siz@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <BotShield shield={shield} />

        <button type="submit" className="btn-primary w-full" disabled={loading || !shield.ready}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
          {loading ? 'Yuborilmoqda...' : 'Kod yuborish'}
        </button>
      </form>
    </AuthShell>
  );
}
