'use client';

import { useEffect, useState } from 'react';
import { Loader2, User, KeyRound } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import RequireAuth from '@/components/RequireAuth';

function ProfileInner() {
  const { user, refresh } = useAuth();
  const [form, setForm] = useState({ fullName: '', bio: '', avatarUrl: '' });
  const [pwd, setPwd] = useState({ currentPassword: '', newPassword: '' });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);

  useEffect(() => {
    if (user) setForm({ fullName: user.fullName || '', bio: user.bio || '', avatarUrl: user.avatarUrl || '' });
  }, [user]);

  const saveProfile = async (e) => {
    e.preventDefault();
    setMsg(''); setErr(''); setSaving(true);
    try {
      await api.put('/me', form);
      await refresh();
      setMsg('Profil saqlandi');
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    setMsg(''); setErr(''); setSavingPwd(true);
    try {
      await api.put('/me/password', pwd);
      setPwd({ currentPassword: '', newPassword: '' });
      setMsg('Parol o\'zgartirildi');
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setSavingPwd(false);
    }
  };

  return (
    <div className="container-page max-w-2xl py-10">
      <h1 className="text-3xl">Profil sozlamalari</h1>

      {msg && <div className="mt-4 rounded-xl bg-indigo-50 px-4 py-2.5 text-sm text-indigo-700">{msg}</div>}
      {err && <div className="mt-4 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{err}</div>}

      {/* Profil */}
      <form onSubmit={saveProfile} className="card mt-6 p-6">
        <div className="mb-4 flex items-center gap-2 font-semibold"><User size={18} /> Shaxsiy ma'lumotlar</div>
        <div className="mb-4">
          <label className="label">Ism-familiya</label>
          <input className="input" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
        </div>
        <div className="mb-4">
          <label className="label">Email</label>
          <input className="input bg-slate-50" value={user?.email || ''} disabled />
        </div>
        <div className="mb-4">
          <label className="label">Avatar rasmi (URL)</label>
          <input className="input" placeholder="https://..." value={form.avatarUrl} onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })} />
        </div>
        <div className="mb-5">
          <label className="label">Bio</label>
          <textarea className="input min-h-[90px]" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="O'zingiz haqingizda..." />
        </div>
        <button className="btn-primary" disabled={saving}>
          {saving && <Loader2 size={16} className="animate-spin" />} Saqlash
        </button>
      </form>

      {/* Parol */}
      <form onSubmit={savePassword} className="card mt-6 p-6">
        <div className="mb-4 flex items-center gap-2 font-semibold"><KeyRound size={18} /> Parolni o'zgartirish</div>
        <div className="mb-4">
          <label className="label">Joriy parol</label>
          <input type="password" className="input" value={pwd.currentPassword} onChange={(e) => setPwd({ ...pwd, currentPassword: e.target.value })} required />
        </div>
        <div className="mb-5">
          <label className="label">Yangi parol</label>
          <input type="password" className="input" value={pwd.newPassword} onChange={(e) => setPwd({ ...pwd, newPassword: e.target.value })} required />
        </div>
        <button className="btn-outline" disabled={savingPwd}>
          {savingPwd && <Loader2 size={16} className="animate-spin" />} Parolni yangilash
        </button>
      </form>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <RequireAuth>
      <ProfileInner />
    </RequireAuth>
  );
}
