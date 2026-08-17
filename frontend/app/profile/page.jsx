'use client';

import { useEffect, useState } from 'react';
import { Loader2, User, KeyRound, Send, Link2, Unlink, CheckCircle2, Bell } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import RequireAuth from '@/components/RequireAuth';

// Telegram bot bilan bogʻlanish. Havola bir martalik va 15 daqiqa amal qiladi,
// shuning uchun uni oldindan emas, bosilganda soʻraymiz.
function TelegramCard() {
  const [tg, setTg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const load = () => api.get('/me/telegram')
    .then((res) => setTg(res.telegram))
    .catch(() => setTg({ available: false, linked: false }));

  useEffect(() => { load(); }, []);

  const connect = async () => {
    setBusy(true); setErr('');
    try {
      const res = await api.post('/me/telegram/link');
      // Yangi oynada bot ochiladi; qaytgach holat yangilansin
      window.open(res.url, '_blank', 'noopener');
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    if (!window.confirm('Telegram bogʻlanishini uzasizmi? Botga xabarlar kelmay qoladi.')) return;
    setBusy(true); setErr('');
    try {
      await api.del('/me/telegram');
      await load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  // Bot sozlanmagan boʻlsa kartochkani umuman koʻrsatmaymiz
  if (!tg || (!tg.available && !tg.linked)) return null;

  return (
    <div className="card mt-6 p-6">
      <div className="mb-4 flex items-center gap-2 font-semibold"><Send size={18} /> Telegram</div>

      {err && <div className="mb-4 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{err}</div>}

      {tg.linked ? (
        <>
          <p className="flex items-center gap-2 text-sm text-emerald-700">
            <CheckCircle2 size={16} />
            Ulangan{tg.username ? <span className="font-mono">@{tg.username}</span> : null}
          </p>
          <p className="mt-1 text-sm text-muted">
            Kurslaringiz va xabarlaringizni botdan olasiz. Botda <span className="font-mono">/yordam</span> deb yozing.
          </p>
          <button onClick={disconnect} disabled={busy} className="btn-outline mt-4 disabled:opacity-50">
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Unlink size={16} />} Uzish
          </button>
        </>
      ) : (
        <>
          <p className="text-sm text-muted">
            Hisobingizni botga ulang — kurslaringiz, progressingiz va xabarlar Telegramʼga keladi.
            {tg.botUsername ? <> Bot: <span className="font-mono">@{tg.botUsername}</span></> : null}
          </p>
          <button onClick={connect} disabled={busy} className="btn-primary mt-4 disabled:opacity-50">
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />} Telegramʼga ulash
          </button>
          <p className="mt-2 text-xs text-muted">
            Bot yangi oynada ochiladi. Ulangach shu sahifani yangilang.
          </p>
        </>
      )}
    </div>
  );
}

// Qaysi hodisalar Telegramʼga yuborilishi. Sayt ichidagi xabarlar roʻyxati
// baribir toʻladi — bu sozlama faqat botga taʼsir qiladi (botdagi /sozlamalar
// bilan bir xil joyda saqlanadi).
function NotifyPrefsCard() {
  const [data, setData] = useState(null);
  const [off, setOff] = useState([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get('/me/notify-prefs')
      .then((res) => { setData(res); setOff(res.off || []); })
      .catch(() => setData(null));
  }, []);

  const toggle = (key) => {
    setMsg('');
    setOff((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const save = async () => {
    setSaving(true); setMsg(''); setErr('');
    try {
      await api.put('/me/notify-prefs', { off });
      setMsg('Bildirishnoma sozlamalari saqlandi');
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!data) return null;

  return (
    <div className="card mt-6 p-6">
      <div className="mb-1 flex items-center gap-2 font-semibold">
        <Bell size={18} /> Bildirishnomalar
      </div>
      <p className="mb-4 text-sm text-muted">
        {data.telegramLinked
          ? 'Qaysi xabarlar Telegram botga kelishini tanlang.'
          : 'Telegram ulanmagan — sozlama Telegramʼni ulaganingizda kuchga kiradi.'}
      </p>

      {msg && <div className="mb-4 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">{msg}</div>}
      {err && <div className="mb-4 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{err}</div>}

      <ul className="divide-y divide-line">
        {data.events.map((e) => (
          <li key={e.key} className="flex items-start justify-between gap-4 py-3">
            <div>
              <p className="text-sm font-medium text-ink">{e.label}</p>
              <p className="text-xs text-muted">{e.description}</p>
            </div>
            <label className="flex shrink-0 cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4 accent-indigo-600"
                checked={!off.includes(e.key)}
                onChange={() => toggle(e.key)}
              />
              <span className="text-muted">{off.includes(e.key) ? 'Oʻchiq' : 'Yoniq'}</span>
            </label>
          </li>
        ))}
      </ul>

      <button onClick={save} disabled={saving} className="btn-primary mt-4 disabled:opacity-50">
        {saving ? <Loader2 size={16} className="animate-spin" /> : <Bell size={16} />} Saqlash
      </button>

      <p className="mt-3 text-xs text-muted">
        Oʻchirilgan xabarlar ham saytdagi "Xabarlar" boʻlimida saqlanadi.
      </p>
    </div>
  );
}

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
      setMsg('Parol oʻzgartirildi');
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
        <div className="mb-4 flex items-center gap-2 font-semibold"><User size={18} /> Shaxsiy maʼlumotlar</div>
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
          <textarea className="input min-h-[90px]" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Oʻzingiz haqingizda..." />
        </div>
        <button className="btn-primary" disabled={saving}>
          {saving && <Loader2 size={16} className="animate-spin" />} Saqlash
        </button>
      </form>

      {/* Parol */}
      <form onSubmit={savePassword} className="card mt-6 p-6">
        <div className="mb-4 flex items-center gap-2 font-semibold"><KeyRound size={18} /> Parolni oʻzgartirish</div>
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

      <TelegramCard />

      <NotifyPrefsCard />
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
