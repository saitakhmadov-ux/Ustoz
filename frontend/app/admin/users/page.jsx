'use client';

import { useEffect, useState } from 'react';
import { Shield, User, GraduationCap, Plus, Trash2, Loader2, X } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Spinner, ErrorState } from '@/components/ui';

// Rol bo'yicha ko'rinish
function roleBadge(role) {
  if (role === 'ADMIN') return { label: 'Bosh admin', cls: 'bg-indigo-50 text-indigo-700', Icon: Shield };
  if (role === 'INSTRUCTOR') return { label: 'Ustoz', cls: 'bg-indigo-50 text-indigo-700', Icon: GraduationCap };
  return { label: 'Foydalanuvchi', cls: 'bg-slate-100 text-slate-600', Icon: User };
}

export default function AdminUsersPage() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Yangi foydalanuvchi formasi
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ fullName: '', email: '', password: '', role: 'USER' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = () => {
    setLoading(true);
    api.get('/admin/users')
      .then((res) => setUsers(res.users))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    setFormError('');
    if (form.fullName.trim().length < 2) return setFormError('Ism juda qisqa');
    if (!form.email.includes('@')) return setFormError('Email noto\'g\'ri');
    if (form.password.length < 6) return setFormError('Parol kamida 6 belgi');
    setSaving(true);
    try {
      await api.post('/admin/users', {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
      });
      setForm({ fullName: '', email: '', password: '', role: 'USER' });
      setShowForm(false);
      load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (u) => {
    if (!confirm(`"${u.fullName}" foydalanuvchisini o'chirasizmi? Uning yozilishlari, to'lovlari va sertifikatlari ham o'chadi.`)) return;
    try {
      await api.del(`/admin/users/${u.id}`);
      load();
    } catch (err) { alert(err.message); }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl">Foydalanuvchilar</h1>
          <p className="mt-1 text-sm text-muted">Ro'yxatdan o'tgan foydalanuvchilar ({users.length})</p>
        </div>
        <button onClick={() => setShowForm((v) => !v)} className="btn-primary">
          <Plus size={16} /> Yangi foydalanuvchi
        </button>
      </div>

      {/* Yangi foydalanuvchi formasi */}
      {showForm && (
        <form onSubmit={create} className="card mt-6 p-6">
          {formError && <div className="mb-4 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{formError}</div>}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="label">To'liq ism</label>
              <input className="input" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="Ism Familiya" required />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="foydalanuvchi@ustoz.uz" required />
            </div>
            <div>
              <label className="label">Parol</label>
              <input type="text" className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="kamida 6 belgi" required />
            </div>
            <div>
              <label className="label">Rol</label>
              <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="USER">Foydalanuvchi</option>
                <option value="ADMIN">Bosh admin</option>
              </select>
            </div>
          </div>
          <p className="mt-2 text-xs text-muted">💡 Ustoz (2-darajali admin) qo'shish uchun "Ustozlar" bo'limidan foydalaning.</p>
          <div className="mt-4 flex gap-2">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving && <Loader2 size={16} className="animate-spin" />} Yaratish
            </button>
            <button type="button" onClick={() => { setShowForm(false); setFormError(''); }} className="btn-ghost"><X size={16} /> Bekor qilish</button>
          </div>
        </form>
      )}

      <div className="mt-6">
        {error ? <ErrorState message={error} /> : loading ? <Spinner /> : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-line bg-slate-50 text-left text-xs uppercase text-muted">
                  <tr>
                    <th className="px-4 py-3">Foydalanuvchi</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Rol</th>
                    <th className="px-4 py-3">Kurslar</th>
                    <th className="px-4 py-3">Sertifikat</th>
                    <th className="px-4 py-3">Ro'yxatdan o'tgan</th>
                    <th className="px-4 py-3 text-right">Amal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {users.map((u) => {
                    const { label, cls, Icon } = roleBadge(u.role);
                    const isSelf = me?.id === u.id;
                    return (
                      <tr key={u.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-xs font-bold text-white">
                              {u.fullName?.charAt(0)?.toUpperCase()}
                            </span>
                            <span className="font-medium">{u.fullName}{isSelf && <span className="ml-1 text-xs text-muted">(siz)</span>}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted">{u.email}</td>
                        <td className="px-4 py-3">
                          <span className={`badge ${cls}`}><Icon size={12} /> {label}</span>
                        </td>
                        <td className="px-4 py-3">{u._count.enrollments}</td>
                        <td className="px-4 py-3">{u._count.certificates}</td>
                        <td className="px-4 py-3 text-muted">{new Date(u.createdAt).toLocaleDateString('uz-UZ')}</td>
                        <td className="px-4 py-3 text-right">
                          {isSelf ? (
                            <span className="text-xs text-slate-300">—</span>
                          ) : (
                            <button onClick={() => remove(u)} title="O'chirish" className="grid h-8 w-8 place-items-center rounded-lg text-red-600 hover:bg-red-50 ml-auto">
                              <Trash2 size={16} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
