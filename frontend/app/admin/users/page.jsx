'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Shield, User, GraduationCap, Plus, Trash2, Loader2, X, Users as UsersIcon, MailWarning,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useTableQuery } from '@/lib/useTableQuery';
import { Spinner, ErrorState, EmptyState, Pagination } from '@/components/ui';
import {
  PageHeader, DataToolbar, FilterSelect, CountTabs, DataTable, Avatar,
} from '@/components/admin/table';

const VERIFIED_OPTIONS = [
  { value: 'yes', label: 'Tasdiqlangan' },
  { value: 'no', label: 'Tasdiqlanmagan' },
];

// Rol bo'yicha ko'rinish
const ROLES = {
  ADMIN: { label: 'Bosh admin', cls: 'bg-indigo-50 text-indigo-700', Icon: Shield },
  INSTRUCTOR: { label: 'Ustoz', cls: 'bg-indigo-50 text-indigo-700', Icon: GraduationCap },
  USER: { label: "O'quvchi", cls: 'bg-slate-100 text-slate-600', Icon: User },
};

const TABS = [
  { key: '', label: 'Barchasi', countKey: 'all' },
  { key: 'USER', label: "O'quvchilar", countKey: 'USER' },
  { key: 'INSTRUCTOR', label: 'Ustozlar', countKey: 'INSTRUCTOR' },
  { key: 'ADMIN', label: 'Adminlar', countKey: 'ADMIN' },
];

const COLUMNS = [
  { label: 'Odam' },
  { label: 'Email' },
  { label: 'Rol' },
  { label: 'Kurslar' },
  { label: 'Sertifikat' },
  { label: "Ro'yxatdan o'tgan" },
  { label: 'Amal', align: 'right' },
];

const EMPTY_FORM = { fullName: '', email: '', password: '', role: 'USER' };

export default function AdminPeoplePage() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [roleCounts, setRoleCounts] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const t = useTableQuery({ filters: { q: '', role: '', verified: '' } });

  // Yangi odam formasi
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/admin/users?${t.params}`)
      .then((res) => {
        setUsers(res.users);
        setRoleCounts(res.roleCounts);
        setPagination(res.pagination);
        setError('');
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [t.params]);

  useEffect(() => { load(); }, [load]);

  // Rol yorlig'i almashganda forma ham o'sha rolga moslanadi
  const changeRoleTab = (role) => {
    t.set('role', role);
    if (role) setForm((f) => ({ ...f, role }));
  };

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
      setForm({ ...EMPTY_FORM, role: form.role });
      setShowForm(false);
      load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (u) => {
    const warning = u.role === 'INSTRUCTOR'
      ? 'Uning kurslari saqlanadi, faqat biriktirish uziladi.'
      : 'Uning yozilishlari, to\'lovlari va sertifikatlari ham o\'chadi.';
    if (!confirm(`"${u.fullName}" ni o'chirasizmi? ${warning}`)) return;
    try {
      await api.del(`/admin/users/${u.id}`);
      t.pageBackIfEmpty(users.length, load);
    } catch (err) { alert(err.message); }
  };

  const activeRole = t.values.role;

  return (
    <div>
      <PageHeader
        title="Odamlar"
        subtitle="Platformadagi barcha o'quvchilar, ustozlar va adminlar"
      >
        <button onClick={() => setShowForm((v) => !v)} className="btn-primary">
          <Plus size={16} /> Yangi odam
        </button>
      </PageHeader>

      {/* Yangi odam formasi — uchala rol ham shu yerdan yaratiladi */}
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
                <option value="USER">O'quvchi</option>
                <option value="INSTRUCTOR">Ustoz (2-darajali admin)</option>
                <option value="ADMIN">Bosh admin</option>
              </select>
            </div>
          </div>
          {form.role === 'INSTRUCTOR' && (
            <p className="mt-2 text-xs text-muted">
              💡 Ustoz faqat o'ziga biriktirilgan kurs kontentini boshqaradi. Kursni biriktirish
              uchun <b>Kurslar</b> bo'limida kursni tahrirlab, "Biriktirilgan ustoz" maydonini tanlang.
            </p>
          )}
          <div className="mt-4 flex gap-2">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving && <Loader2 size={16} className="animate-spin" />} Yaratish
            </button>
            <button type="button" onClick={() => { setShowForm(false); setFormError(''); }} className="btn-ghost">
              <X size={16} /> Bekor qilish
            </button>
          </div>
        </form>
      )}

      {/* Rol yorliqlari — alohida "Ustozlar" sahifasi o'rniga */}
      {roleCounts && (
        <CountTabs
          value={activeRole}
          onChange={changeRoleTab}
          items={TABS.map((tab) => ({ ...tab, count: roleCounts[tab.countKey] ?? 0 }))}
        />
      )}

      <DataToolbar
        search={t.search}
        onSearch={t.setSearch}
        placeholder="Ism yoki email bo'yicha qidirish..."
        hasFilters={t.hasFilters}
        onReset={t.reset}
      >
        <FilterSelect
          value={t.values.verified}
          onChange={(v) => t.set('verified', v)}
          options={VERIFIED_OPTIONS}
          placeholder="Tasdiqlash holati"
          width="200px"
        />
      </DataToolbar>

      <div className="mt-4">
        {error ? <ErrorState message={error} /> : loading ? <Spinner /> : users.length === 0 ? (
          <EmptyState
            title="Hech kim topilmadi"
            text={t.hasFilters ? 'Qidiruv yoki filtrni o\'zgartirib ko\'ring.' : 'Hali hech kim yo\'q.'}
            icon={UsersIcon}
          />
        ) : (
          <DataTable
            columns={COLUMNS}
            footer={pagination && (
              <Pagination
                page={pagination.page}
                pages={pagination.pages}
                total={pagination.total}
                onChange={t.setPage}
                label="odam"
              />
            )}
          >
            {users.map((u) => {
              const { label, cls, Icon } = ROLES[u.role] || ROLES.USER;
              const isSelf = me?.id === u.id;
              const taught = u.taughtCourses || [];
              return (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/users/${u.id}`} className="flex items-center gap-2.5 hover:text-primary">
                      <Avatar name={u.fullName} />
                      <span className="font-medium">
                        {u.fullName}
                        {isSelf && <span className="ml-1 text-xs text-muted">(siz)</span>}
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {u.email}
                    {!u.emailVerifiedAt && (
                      <span
                        className="badge ml-1.5 bg-amber-50 text-amber-700"
                        title="Email tasdiqlanmagan — bu foydalanuvchi tizimga kira olmaydi"
                      >
                        <MailWarning size={12} /> tasdiqlanmagan
                      </span>
                    )}
                    {u.phone && <p className="text-xs text-slate-400">{u.phone}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${cls}`}><Icon size={12} /> {label}</span>
                  </td>
                  <td className="px-4 py-3">
                    {u.role === 'INSTRUCTOR' ? (
                      taught.length === 0 ? (
                        <span className="text-xs text-slate-400">biriktirilmagan</span>
                      ) : (
                        <span title={taught.map((c) => c.title).join(', ')}>
                          {taught.length}
                          <span className="ml-1 text-xs text-muted">biriktirilgan</span>
                        </span>
                      )
                    ) : (
                      <span>
                        {u._count.enrollments}
                        <span className="ml-1 text-xs text-muted">yozilgan</span>
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {u.role === 'INSTRUCTOR' ? <span className="text-slate-300">—</span> : u._count.certificates}
                  </td>
                  <td className="px-4 py-3 text-muted">{new Date(u.createdAt).toLocaleDateString('uz-UZ')}</td>
                  <td className="px-4 py-3 text-right">
                    {isSelf ? (
                      <span className="text-xs text-slate-300">—</span>
                    ) : (
                      <button onClick={() => remove(u)} title="O'chirish" className="ml-auto grid h-8 w-8 place-items-center rounded-lg text-red-600 hover:bg-red-50">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </DataTable>
        )}
      </div>

      {activeRole === 'INSTRUCTOR' && (
        <p className="mt-6 rounded-xl bg-slate-50 px-4 py-3 text-xs text-muted">
          💡 Kursni ustozga biriktirish uchun <b>Kurslar</b> bo'limida kursni tahrirlab,
          "Biriktirilgan ustoz" maydonini tanlang.
        </p>
      )}
    </div>
  );
}
