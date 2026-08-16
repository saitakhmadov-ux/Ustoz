'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Send, Users, BookOpen, UserCheck, Mail, Loader2, Search, CheckCircle2, History, Bot,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Spinner, ErrorState } from '@/components/ui';

export default function AdminMessagesPage() {
  const [aud, setAud] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Forma holati
  const [mode, setMode] = useState('course'); // 'all' | 'course' | 'users'
  const [courseId, setCourseId] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]); // id[]
  const [search, setSearch] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sendEmail, setSendEmail] = useState(false);
  const [sendTelegram, setSendTelegram] = useState(false);

  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [formError, setFormError] = useState('');

  // Yuborilganlar tarixi
  const [sent, setSent] = useState([]);

  const loadSent = () => {
    api.get('/admin/notifications/sent').then((res) => setSent(res.notifications)).catch(() => {});
  };

  useEffect(() => {
    api.get('/admin/notifications/audience')
      .then((res) => {
        setAud(res);
        if (res.courses.length > 0) setCourseId(res.courses[0].id);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
    loadSent();
  }, []);

  const filteredUsers = useMemo(() => {
    if (!aud) return [];
    const q = search.trim().toLowerCase();
    if (!q) return aud.users;
    return aud.users.filter((u) => u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [aud, search]);

  const toggleUser = (id) => {
    setSelectedUsers((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const recipientCount = useMemo(() => {
    if (!aud) return 0;
    if (mode === 'all') return aud.users.length;
    if (mode === 'course') return aud.courses.find((c) => c.id === courseId)?._count.enrollments || 0;
    return selectedUsers.length;
  }, [aud, mode, courseId, selectedUsers]);

  const submit = async (e) => {
    e.preventDefault();
    setFormError(''); setResult(null);
    if (title.trim().length < 2) return setFormError('Sarlavha juda qisqa');
    if (body.trim().length < 1) return setFormError('Xabar matnini kiriting');
    if (mode === 'course' && !courseId) return setFormError('Kursni tanlang');
    if (mode === 'users' && selectedUsers.length === 0) return setFormError('Kamida bitta foydalanuvchi tanlang');

    setSending(true);
    try {
      const payload = { mode, title: title.trim(), body: body.trim(), sendEmail, sendTelegram };
      if (mode === 'course') payload.courseId = courseId;
      if (mode === 'users') payload.userIds = selectedUsers;
      const res = await api.post('/admin/notifications', payload);
      setResult(res);
      setTitle(''); setBody(''); setSelectedUsers([]); setSendEmail(false); setSendTelegram(false);
      loadSent();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSending(false);
    }
  };

  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} />;

  const isAdmin = aud.isAdmin;

  const modes = [
    ...(isAdmin ? [{ key: 'all', label: 'Barcha foydalanuvchilar', icon: Users }] : []),
    { key: 'course', label: 'Kurs o\'quvchilari', icon: BookOpen },
    { key: 'users', label: 'Muayyan foydalanuvchilar', icon: UserCheck },
  ];

  return (
    <div>
      <h1 className="text-2xl">Xabar yuborish</h1>
      <p className="mt-1 text-sm text-muted">
        {isAdmin
          ? "Foydalanuvchilarga akkaunt xabari va (ixtiyoriy) email yoki Telegram orqali yuboring"
          : 'O\'z kurslaringiz o\'quvchilariga xabar yuboring'}
      </p>

      {result && (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-indigo-50 px-4 py-3 text-sm text-indigo-700">
          <CheckCircle2 size={18} /> {result.message}
          {result.email && <span className="text-indigo-600">· email: {result.email.mocked ? 'mock (log)' : 'yuborildi'} ({result.email.attempted} ta)</span>}
          {result.telegram && (
            <span className="text-indigo-600">
              · Telegram: {result.telegram.queued} ta navbatga qo'yildi
              {result.telegram.skipped > 0 && `, ${result.telegram.skipped} ta hisobini ulamagan`}
            </span>
          )}
        </div>
      )}

      <form onSubmit={submit} className="card mt-6 p-6">
        {formError && <div className="mb-4 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{formError}</div>}

        {/* Qabul qiluvchi turi */}
        <label className="label">Kimga yuboriladi?</label>
        <div className="grid gap-2 sm:grid-cols-3">
          {modes.map((m) => {
            const Icon = m.icon;
            const active = mode === m.key;
            return (
              <button
                key={m.key}
                type="button"
                onClick={() => setMode(m.key)}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors
                  ${active ? 'border-primary bg-indigo-50 text-primary' : 'border-line hover:bg-slate-50'}`}
              >
                <Icon size={16} /> {m.label}
              </button>
            );
          })}
        </div>

        {/* Kurs tanlash */}
        {mode === 'course' && (
          <div className="mt-4">
            <label className="label">Kurs</label>
            <select className="input" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
              {aud.courses.length === 0 && <option value="">Kurs yo'q</option>}
              {aud.courses.map((c) => (
                <option key={c.id} value={c.id}>{c.title} ({c._count.enrollments} o'quvchi)</option>
              ))}
            </select>
          </div>
        )}

        {/* Foydalanuvchi tanlash */}
        {mode === 'users' && (
          <div className="mt-4">
            <label className="label">Foydalanuvchilar ({selectedUsers.length} tanlangan)</label>
            <div className="relative mb-2">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
              <input className="input pl-9" placeholder="Ism yoki email bo'yicha qidirish..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="max-h-56 overflow-y-auto rounded-xl border border-line">
              {filteredUsers.length === 0 ? (
                <p className="p-4 text-center text-sm text-muted">Foydalanuvchi topilmadi</p>
              ) : filteredUsers.map((u) => (
                <label key={u.id} className="flex cursor-pointer items-center gap-3 border-b border-line px-3 py-2 text-sm last:border-0 hover:bg-slate-50">
                  <input type="checkbox" checked={selectedUsers.includes(u.id)} onChange={() => toggleUser(u.id)} className="h-4 w-4 rounded text-primary focus:ring-primary" />
                  <span className="font-medium">{u.fullName}</span>
                  <span className="text-muted">{u.email}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Xabar mazmuni */}
        <div className="mt-4">
          <label className="label">Sarlavha</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Masalan: Yangi dars qo'shildi" maxLength={160} />
        </div>
        <div className="mt-4">
          <label className="label">Xabar matni</label>
          <textarea className="input min-h-[120px]" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Xabaringizni yozing..." maxLength={4000} />
        </div>

        {/* Qo'shimcha kanallar — sayt bildirishnomasi har doim yuboriladi */}
        <div className="mt-4 space-y-2">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} className="h-4 w-4 rounded text-primary focus:ring-primary" />
            <Mail size={15} /> Emailga ham yuborilsin
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" checked={sendTelegram} onChange={(e) => setSendTelegram(e.target.checked)} className="h-4 w-4 rounded text-primary focus:ring-primary" />
            <Bot size={15} /> Telegram botga ham yuborilsin
            <span className="text-xs text-muted">— faqat hisobini ulaganlarga</span>
          </label>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <button type="submit" disabled={sending || recipientCount === 0} className="btn-primary">
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            Yuborish ({recipientCount} ta)
          </button>
        </div>
      </form>

      {/* Yuborilganlar tarixi */}
      <div className="mt-8">
        <h2 className="flex items-center gap-2 text-lg"><History size={18} className="text-primary" /> So'nggi yuborilgan xabarlar</h2>
        {sent.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">Hali xabar yuborilmagan</p>
        ) : (
          <div className="card mt-3 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-line bg-slate-50 text-left text-xs uppercase text-muted">
                  <tr>
                    <th className="px-4 py-3">Sarlavha</th>
                    <th className="px-4 py-3">Qabul qiluvchi</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Telegram</th>
                    <th className="px-4 py-3">Holat</th>
                    <th className="px-4 py-3">Sana</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {sent.map((n) => (
                    <tr key={n.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium">{n.title}</td>
                      <td className="px-4 py-3 text-muted">{n.user?.fullName}</td>
                      <td className="px-4 py-3">{n.emailSent ? <span className="badge bg-blue-50 text-blue-600"><Mail size={11} /> Ha</span> : <span className="text-subtle">—</span>}</td>
                      <td className="px-4 py-3">{n.telegramSent ? <span className="badge bg-sky-50 text-sky-700"><Bot size={11} /> Ha</span> : <span className="text-subtle">—</span>}</td>
                      <td className="px-4 py-3">
                        <span className={`badge ${n.read ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'}`}>
                          {n.read ? 'O\'qilgan' : 'O\'qilmagan'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted">{new Date(n.createdAt).toLocaleString('uz-UZ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
