'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Pencil, Trash2, Eye, EyeOff, ListTree } from 'lucide-react';
import { api } from '@/lib/api';
import { formatPrice, LEVELS } from '@/lib/constants';
import { useAuth } from '@/lib/auth';
import { Spinner, ErrorState, EmptyState } from '@/components/ui';

export default function AdminCoursesPage() {
  const { isAdmin } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    api.get('/courses/admin/all')
      .then((res) => setCourses(res.courses))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const togglePublish = async (id) => {
    try {
      await api.patch(`/courses/${id}/publish`);
      load();
    } catch (err) { alert(err.message); }
  };

  const remove = async (id, title) => {
    if (!confirm(`"${title}" kursini o'chirasizmi? Bu amalni ortga qaytarib bo'lmaydi.`)) return;
    try {
      await api.del(`/courses/${id}`);
      load();
    } catch (err) { alert(err.message); }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl">{isAdmin ? 'Kurslar' : 'Kurslarim'}</h1>
          <p className="mt-1 text-sm text-muted">
            {isAdmin ? 'Kurslarni yaratish va boshqarish' : 'Sizga biriktirilgan kurslar kontenti'}
          </p>
        </div>
        {isAdmin && <Link href="/admin/courses/new" className="btn-primary"><Plus size={16} /> Yangi kurs</Link>}
      </div>

      <div className="mt-6">
        {error ? <ErrorState message={error} /> : loading ? <Spinner /> : courses.length === 0 ? (
          <EmptyState
            title={isAdmin ? "Hali kurs yo'q" : 'Sizga kurs biriktirilmagan'}
            text={isAdmin ? 'Birinchi kursingizni yarating' : 'Bosh admin sizga kurs biriktirgach shu yerda ko\'rinadi'}
          />
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-line bg-slate-50 text-left text-xs uppercase text-muted">
                  <tr>
                    <th className="px-4 py-3">Kurs</th>
                    <th className="px-4 py-3">Kategoriya</th>
                    {isAdmin && <th className="px-4 py-3">Ustoz</th>}
                    <th className="px-4 py-3">Narx</th>
                    <th className="px-4 py-3">Holat</th>
                    <th className="px-4 py-3 text-right">Amallar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {courses.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-medium">{c.title}</p>
                        <p className="text-xs text-muted">{LEVELS[c.level]} · {c._count.sections} bo'lim · {c._count.enrollments} o'quvchi</p>
                      </td>
                      <td className="px-4 py-3 text-muted">{c.category?.name}</td>
                      {isAdmin && (
                        <td className="px-4 py-3 text-muted">
                          {c.instructor
                            ? <span className="badge bg-indigo-50 text-indigo-700">{c.instructor.fullName}</span>
                            : <span className="text-xs text-slate-400">— biriktirilmagan</span>}
                        </td>
                      )}
                      <td className="px-4 py-3">{formatPrice(c.price, c.isFree)}</td>
                      <td className="px-4 py-3">
                        <span className={`badge ${c.published ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                          {c.published ? 'Nashr etilgan' : 'Qoralama'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {isAdmin && (
                            <button onClick={() => togglePublish(c.id)} title={c.published ? 'Nashrdan olish' : 'Nashr etish'} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-slate-200">
                              {c.published ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          )}
                          <Link href={`/admin/courses/${c.id}/curriculum`} title="Darslar" className="grid h-8 w-8 place-items-center rounded-lg hover:bg-slate-200">
                            <ListTree size={16} />
                          </Link>
                          <Link href={`/admin/courses/${c.id}`} title="Tahrirlash" className="grid h-8 w-8 place-items-center rounded-lg hover:bg-slate-200">
                            <Pencil size={16} />
                          </Link>
                          {isAdmin && (
                            <button onClick={() => remove(c.id, c.title)} title="O'chirish" className="grid h-8 w-8 place-items-center rounded-lg text-red-600 hover:bg-red-50">
                              <Trash2 size={16} />
                            </button>
                          )}
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
