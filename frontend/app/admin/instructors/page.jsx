'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GraduationCap, Plus, Trash2, Loader2, Mail, BookOpen } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Spinner, ErrorState, EmptyState } from '@/components/ui';

export default function AdminInstructorsPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Yangi ustoz formasi
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ fullName: '', email: '', password: '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Faqat bosh admin
  useEffect(() => {
    if (!authLoading && !isAdmin) router.replace('/admin/courses');
  }, [authLoading, isAdmin, router]);

  const load = () => {
    setLoading(true);
    api.get('/admin/instructors')
      .then((res) => setInstructors(res.instructors))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  const create = async (e) => {
    e.preventDefault();
    setFormError('');
    if (form.fullName.trim().length < 2) return setFormError('Ism juda qisqa');
    if (!form.email.includes('@')) return setFormError('Email noto\'g\'ri');
    if (form.password.length < 6) return setFormError('Parol kamida 6 belgi');
    setSaving(true);
    try {
      await api.post('/admin/instructors', {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      setForm({ fullName: '', email: '', password: '' });
      setShowForm(false);
      load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id, name) => {
    if (!confirm(`"${name}" ustoz adminini o'chirasizmi? Uning kurslari saqlanadi, faqat biriktirish uziladi.`)) return;
    try {
      await api.del(`/admin/instructors/${id}`);
      load();
    } catch (err) { alert(err.message); }
  };

  if (!isAdmin) return <Spinner />;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl">Ustoz adminlar</h1>
          <p className="mt-1 text-sm text-muted">
            2-darajali ustoz profillari. Ular faqat o'zlariga biriktirilgan kurs kontentini boshqaradi.
          </p>
        </div>
        <button onClick={() => setShowForm((v) => !v)} className="btn-primary">
          <Plus size={16} /> Yangi ustoz
        </button>
      </div>

      {/* Yangi ustoz formasi */}
      {showForm && (
        <form onSubmit={create} className="card mt-6 p-6">
          {formError && <div className="mb-4 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{formError}</div>}
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="label">To'liq ism</label>
              <input className="input" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="Sardor Alimov" required />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="ustoz@ustoz.uz" required />
            </div>
            <div>
              <label className="label">Parol</label>
              <input type="text" className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="kamida 6 belgi" required />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving && <Loader2 size={16} className="animate-spin" />} Yaratish
            </button>
            <button type="button" onClick={() => { setShowForm(false); setFormError(''); }} className="btn-ghost">Bekor qilish</button>
          </div>
        </form>
      )}

      <div className="mt-6">
        {error ? <ErrorState message={error} /> : loading ? <Spinner /> : instructors.length === 0 ? (
          <EmptyState title="Hali ustoz admin yo'q" text="Yuqoridagi tugma orqali birinchi ustozni qo'shing" icon={GraduationCap} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {instructors.map((ins) => (
              <div key={ins.id} className="card p-5">
                <div className="flex items-start gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
                    <GraduationCap size={20} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{ins.fullName}</p>
                    <p className="flex items-center gap-1 text-sm text-muted"><Mail size={13} /> {ins.email}</p>
                  </div>
                  <button onClick={() => remove(ins.id, ins.fullName)} title="O'chirish" className="grid h-8 w-8 place-items-center rounded-lg text-red-600 hover:bg-red-50">
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="mt-4 border-t border-line pt-3">
                  <p className="flex items-center gap-1.5 text-xs font-semibold uppercase text-muted">
                    <BookOpen size={13} /> Biriktirilgan kurslar ({ins.taughtCourses.length})
                  </p>
                  {ins.taughtCourses.length === 0 ? (
                    <p className="mt-2 text-sm text-slate-400">Hali kurs biriktirilmagan</p>
                  ) : (
                    <ul className="mt-2 space-y-1">
                      {ins.taughtCourses.map((c) => (
                        <li key={c.id} className="text-sm text-ink">• {c.title}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="mt-6 rounded-xl bg-slate-50 px-4 py-3 text-xs text-muted">
        💡 Kursni ustozga biriktirish uchun <b>Kurslar</b> bo'limida kursni tahrirlab, "Biriktirilgan ustoz" maydonini tanlang.
      </p>
    </div>
  );
}
