'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { LEVELS, ACCESS_MONTHS } from '@/lib/constants';
import { useAuth } from '@/lib/auth';

// initial = tahrirlash uchun mavjud kurs (ixtiyoriy)
export default function CourseForm({ initial, onSaved }) {
  const { isAdmin } = useAuth();
  const [categories, setCategories] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [form, setForm] = useState({
    title: '', description: '', thumbnail: '', authorName: '',
    price: 0, isFree: false, level: 'BEGINNER', accessMonths: '', categoryId: '', instructorId: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/categories', { auth: false }).then((res) => setCategories(res.categories)).catch(() => {});
    // Ustoz ro'yxati faqat bosh admin uchun kerak (biriktirish maqsadida)
    if (isAdmin) {
      api.get('/admin/instructors').then((res) => setInstructors(res.instructors)).catch(() => {});
    }
  }, [isAdmin]);

  useEffect(() => {
    if (initial) {
      setForm({
        title: initial.title || '',
        description: initial.description || '',
        thumbnail: initial.thumbnail || '',
        authorName: initial.authorName || '',
        price: initial.price || 0,
        isFree: initial.isFree || false,
        level: initial.level || 'BEGINNER',
        accessMonths: initial.accessMonths ?? '',
        categoryId: initial.categoryId || initial.category?.id || '',
        instructorId: initial.instructorId || initial.instructor?.id || '',
      });
    }
  }, [initial]);

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setSaving(true);
    try {
      // Ustoz faqat kontent maydonlarini yuboradi; admin hammasini
      const payload = isAdmin
        ? {
            ...form,
            price: form.isFree ? 0 : Number(form.price),
            accessMonths: form.accessMonths === '' || form.accessMonths === null ? null : Number(form.accessMonths),
            thumbnail: form.thumbnail || undefined,
            instructorId: form.instructorId || null,
          }
        : {
            title: form.title,
            description: form.description,
            authorName: form.authorName,
            level: form.level,
            thumbnail: form.thumbnail || undefined,
          };
      let res;
      if (initial) {
        res = await api.put(`/courses/${initial.id}`, payload);
      } else {
        res = await api.post('/courses', payload);
      }
      onSaved?.(res.course);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="card p-6">
      {error && <div className="mb-4 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="label">Kurs nomi</label>
          <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        </div>

        <div className="md:col-span-2">
          <label className="label">Tavsif</label>
          <textarea className="input min-h-[110px]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
        </div>

        <div>
          <label className="label">Muallif</label>
          <input className="input" value={form.authorName} onChange={(e) => setForm({ ...form, authorName: e.target.value })} required />
        </div>

        {isAdmin && (
          <div>
            <label className="label">Kategoriya</label>
            <select className="input" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} required>
              <option value="">Tanlang...</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}

        <div>
          <label className="label">Daraja</label>
          <select className="input" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>
            {Object.entries(LEVELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>

        {isAdmin && (
          <div>
            <label className="label">Foydalanish muddati (oy)</label>
            <input
              type="number"
              min="1"
              max="60"
              className="input"
              placeholder={`Standart: ${ACCESS_MONTHS[form.level] ?? 1} oy`}
              value={form.accessMonths}
              onChange={(e) => setForm({ ...form, accessMonths: e.target.value })}
            />
            <p className="mt-1 text-xs text-muted">
              Bo'sh qoldirsangiz daraja bo'yicha standart ({ACCESS_MONTHS[form.level] ?? 1} oy) qo'llanadi.
            </p>
          </div>
        )}

        {isAdmin && (
          <>
            <div>
              <label className="label">Narx (so'm)</label>
              <input type="number" min="0" className="input disabled:bg-slate-50" value={form.price} disabled={form.isFree} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            </div>

            <div>
              <label className="label">Biriktirilgan ustoz</label>
              <select className="input" value={form.instructorId} onChange={(e) => setForm({ ...form, instructorId: e.target.value })}>
                <option value="">— biriktirilmagan —</option>
                {instructors.map((ins) => <option key={ins.id} value={ins.id}>{ins.fullName} ({ins.email})</option>)}
              </select>
            </div>
          </>
        )}

        <div className="md:col-span-2">
          <label className="label">Thumbnail rasm (URL)</label>
          <input className="input" placeholder="https://..." value={form.thumbnail} onChange={(e) => setForm({ ...form, thumbnail: e.target.value })} />
        </div>

        {isAdmin && (
          <div className="md:col-span-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isFree} onChange={(e) => setForm({ ...form, isFree: e.target.checked })} className="h-4 w-4 rounded text-primary focus:ring-primary" />
              Bepul kurs
            </label>
          </div>
        )}
      </div>

      <button className="btn-primary mt-6" disabled={saving}>
        {saving && <Loader2 size={16} className="animate-spin" />}
        {initial ? 'Saqlash' : 'Kurs yaratish'}
      </button>
    </form>
  );
}
