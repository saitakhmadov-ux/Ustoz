'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2, Pencil, Loader2, X, Check } from 'lucide-react';
import { api } from '@/lib/api';
import { Spinner, ErrorState } from '@/components/ui';

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', icon: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', icon: '', description: '' });

  const load = () => {
    api.get('/categories', { auth: false })
      .then((res) => setCategories(res.categories))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const add = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/categories', {
        name: form.name,
        icon: form.icon || undefined,
        description: form.description || undefined,
      });
      setForm({ name: '', icon: '', description: '' });
      load();
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  const startEdit = (c) => {
    setEditId(c.id);
    setEditForm({ name: c.name, icon: c.icon || '', description: c.description || '' });
  };

  const saveEdit = async (id) => {
    try {
      await api.put(`/categories/${id}`, {
        name: editForm.name,
        icon: editForm.icon || null,
        description: editForm.description || null,
      });
      setEditId(null);
      load();
    } catch (err) { alert(err.message); }
  };

  const remove = async (id, name) => {
    if (!confirm(`"${name}" kategoriyasini o'chirasizmi?`)) return;
    try { await api.del(`/categories/${id}`); load(); }
    catch (err) { alert(err.message); }
  };

  return (
    <div>
      <h1 className="text-2xl">Kategoriyalar</h1>
      <p className="mt-1 text-sm text-muted">Kurs yo'nalishlarini boshqarish</p>

      {/* Qo'shish formasi */}
      <form onSubmit={add} className="card mt-6 flex flex-wrap items-end gap-3 p-4">
        <div className="w-20">
          <label className="label">Ikon</label>
          <input className="input text-center" placeholder="📚" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} />
        </div>
        <div className="min-w-[160px] flex-1">
          <label className="label">Nom</label>
          <input className="input" placeholder="Kategoriya nomi" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div className="min-w-[200px] flex-[2]">
          <label className="label">Tavsif (ixtiyoriy)</label>
          <input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <button className="btn-primary" disabled={saving}>
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Qo'shish
        </button>
      </form>

      {/* Ro'yxat */}
      <div className="mt-6">
        {error ? <ErrorState message={error} /> : loading ? <Spinner /> : (
          <div className="card divide-y divide-line">
            {categories.map((c) => (
              <div key={c.id} className="flex items-center gap-3 p-4">
                {editId === c.id ? (
                  <>
                    <input className="input w-16 text-center" value={editForm.icon} onChange={(e) => setEditForm({ ...editForm, icon: e.target.value })} />
                    <input className="input flex-1" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                    <input className="input flex-[2]" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
                    <button onClick={() => saveEdit(c.id)} className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-50 text-indigo-600"><Check size={16} /></button>
                    <button onClick={() => setEditId(null)} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-slate-100"><X size={16} /></button>
                  </>
                ) : (
                  <>
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-50 text-xl">{c.icon || '📚'}</span>
                    <div className="flex-1">
                      <p className="font-medium">{c.name}</p>
                      <p className="text-xs text-muted">{c.courseCount} kurs · {c.description || 'tavsifsiz'}</p>
                    </div>
                    <button onClick={() => startEdit(c)} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-slate-100"><Pencil size={15} /></button>
                    <button onClick={() => remove(c.id, c.name)} className="grid h-8 w-8 place-items-center rounded-lg text-red-500 hover:bg-red-50"><Trash2 size={15} /></button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
