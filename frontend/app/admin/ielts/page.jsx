'use client';

// Admin → IELTS topshiriqlari.
// Savol matni, diagramma ma'lumoti, rasm va sozlamalar shu yerdan boshqariladi.

import { useEffect, useState } from 'react';
import {
  Plus, Pencil, Trash2, Eye, EyeOff, PenLine, ImageOff, Search,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Spinner, ErrorState, EmptyState } from '@/components/ui';
import IeltsTaskEditor from '@/components/admin/IeltsTaskEditor';

const FILTERS = [
  { id: '', label: 'Hammasi' },
  { id: 'ACADEMIC_T1', label: 'Academic T1' },
  { id: 'GENERAL_T1', label: 'General T1' },
  { id: 'TASK2', label: 'Task 2' },
  { id: 'TYPING', label: 'Typing' },
  { id: 'VOCAB', label: 'Vocabulary' },
];

export default function AdminIeltsPage() {
  const [tasks, setTasks] = useState([]);
  const [counts, setCounts] = useState({});
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null); // task obyekti yoki 'new'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    api.get(`/admin/ielts/tasks${filter ? `?type=${filter}` : ''}`)
      .then((res) => { setTasks(res.tasks); setCounts(res.counts); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);

  const toggleActive = async (t) => {
    try {
      await api.put(`/admin/ielts/tasks/${t.id}`, { active: !t.active });
      load();
    } catch (err) { alert(err.message); }
  };

  const remove = async (t) => {
    if (!confirm(`"${t.title}" topshirig'ini o'chirasizmi?`)) return;
    try {
      await api.del(`/admin/ielts/tasks/${t.id}`);
      load();
    } catch (err) { alert(err.message); }
  };

  const shown = tasks.filter((t) => {
    const q = search.trim().toLowerCase();
    return !q || t.title.toLowerCase().includes(q) || (t.subtype || '').toLowerCase().includes(q);
  });

  if (editing) {
    return (
      <div>
        <IeltsTaskEditor
          task={editing === 'new' ? null : editing}
          onDone={() => { setEditing(null); load(); }}
          onCancel={() => setEditing(null)}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent/10 text-accent-dark">
            <PenLine size={21} />
          </span>
          <div>
            <h1 className="text-2xl">IELTS topshiriqlari</h1>
            <p className="text-sm text-muted">
              Klaviatura kursi ichidagi IELTS Writing bo'limi uchun savollar va mashqlar
            </p>
          </div>
        </div>
        <button onClick={() => setEditing('new')} className="btn-primary">
          <Plus size={16} /> Yangi topshiriq
        </button>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors
              ${filter === f.id ? 'bg-slate-900 text-white' : 'text-muted hover:bg-slate-100'}`}
          >
            {f.label}
            {f.id && counts[f.id] != null && <span className="ml-1.5 text-xs opacity-70">{counts[f.id]}</span>}
          </button>
        ))}
        <div className="relative ml-auto">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            className="input max-w-[220px] pl-9"
            placeholder="Qidirish…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-5">
        {error ? <ErrorState message={error} /> : loading ? <Spinner /> : shown.length === 0 ? (
          <EmptyState title="Topshiriq topilmadi" text="Yangi topshiriq qo'shing yoki filtrni o'zgartiring" />
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-line bg-slate-50 text-left text-xs uppercase text-muted">
                  <tr>
                    <th className="px-4 py-3">Topshiriq</th>
                    <th className="px-4 py-3">Turi</th>
                    <th className="px-4 py-3">Vizual</th>
                    <th className="px-4 py-3">Ishlangan</th>
                    <th className="px-4 py-3">Holat</th>
                    <th className="px-4 py-3 text-right">Amallar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {shown.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-ink">{t.title}</p>
                        <p className="text-xs text-muted">{t.code} · {t.subtype || '—'}{t.level ? ` · ${t.level}` : ''}</p>
                      </td>
                      <td className="px-4 py-3 text-muted">{t.type}</td>
                      <td className="px-4 py-3">
                        {t.visual === 'NONE' ? <span className="text-muted">—</span> : (
                          <span className="flex items-center gap-1.5">
                            <span className="badge bg-slate-100 text-slate-600">{t.visual}</span>
                            {(t.visual === 'PROCESS' || t.visual === 'MAP') && !t.imageUrl && (
                              <span title="Rasm yuklanmagan" className="text-amber-600"><ImageOff size={14} /></span>
                            )}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted">{t._count?.attempts ?? 0}</td>
                      <td className="px-4 py-3">
                        <span className={`badge ${t.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                          {t.active ? 'Faol' : 'Nofaol'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => toggleActive(t)} title={t.active ? 'Nofaol qilish' : 'Faollashtirish'} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-slate-200">
                            {t.active ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                          <button onClick={() => setEditing(t)} title="Tahrirlash" className="grid h-8 w-8 place-items-center rounded-lg hover:bg-slate-200">
                            <Pencil size={16} />
                          </button>
                          <button onClick={() => remove(t)} title="O'chirish" className="grid h-8 w-8 place-items-center rounded-lg text-red-600 hover:bg-red-50">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
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
