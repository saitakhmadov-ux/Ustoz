'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, X, Users as UsersIcon, GraduationCap, Clock, PlayCircle, CircleSlash } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Spinner, ErrorState, EmptyState, Pagination } from '@/components/ui';

// Yozilish holati — yorliq va rang
const STATUS = {
  completed: { label: 'Tugatgan', cls: 'bg-emerald-50 text-emerald-700', Icon: GraduationCap },
  inProgress: { label: 'Jarayonda', cls: 'bg-indigo-50 text-indigo-700', Icon: PlayCircle },
  notStarted: { label: 'Boshlamagan', cls: 'bg-slate-100 text-slate-600', Icon: CircleSlash },
  expired: { label: 'Muddati tugagan', cls: 'bg-amber-50 text-amber-700', Icon: Clock },
};

// Holat yorliqlari (chap tomondan o'ngga) — summary'dagi kalitlar bilan bir xil
const TABS = [
  { key: '', label: 'Barchasi', count: 'all' },
  { key: 'inProgress', label: 'Jarayonda', count: 'inProgress' },
  { key: 'notStarted', label: 'Boshlamagan', count: 'notStarted' },
  { key: 'completed', label: 'Tugatgan', count: 'completed' },
  { key: 'expired', label: 'Muddati tugagan', count: 'expired' },
];

// Progress foiziga qarab rang: past — qizil, o'rta — sabzi, yuqori — yashil
function barColor(percent) {
  if (percent >= 70) return 'bg-emerald-500';
  if (percent >= 30) return 'bg-amber-500';
  return 'bg-rose-500';
}

// "3 kun oldin" ko'rinishidagi nisbiy vaqt
function relativeTime(date) {
  if (!date) return null;
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
  if (days <= 0) return 'bugun';
  if (days === 1) return 'kecha';
  if (days < 30) return `${days} kun oldin`;
  const months = Math.floor(days / 30);
  return months === 1 ? '1 oy oldin' : `${months} oy oldin`;
}

export default function TeachingStudentsPage() {
  const { isAdmin } = useAuth();
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Qidiruv va filtrlar
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [courseId, setCourseId] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('recent');
  const [page, setPage] = useState(1);

  // Yozishni to'xtatgandan 400ms keyin qidiramiz
  useEffect(() => {
    const t = setTimeout(() => { setQ(search.trim()); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '20', sort });
    if (q) params.set('q', q);
    if (courseId) params.set('courseId', courseId);
    if (status) params.set('status', status);

    api.get(`/admin/teaching/students?${params}`)
      .then((res) => {
        setStudents(res.students);
        setCourses(res.courses);
        setSummary(res.summary);
        setPagination(res.pagination);
        setError('');
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [q, courseId, status, sort, page]);

  useEffect(() => { load(); }, [load]);

  const hasFilters = q || courseId || status;
  const clearFilters = () => {
    setSearch(''); setQ(''); setCourseId(''); setStatus(''); setPage(1);
  };

  // Kurs biriktirilmagan ustoz uchun alohida holat
  if (!loading && !error && courses.length === 0) {
    return (
      <div>
        <h1 className="text-2xl">{isAdmin ? 'O\'quvchilar' : 'O\'quvchilarim'}</h1>
        <div className="mt-6">
          <EmptyState
            title="Hali kurs biriktirilmagan"
            text="Sizga kurs biriktirilgach, unga yozilgan o'quvchilar shu yerda ko'rinadi."
            icon={UsersIcon}
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div>
        <h1 className="text-2xl">{isAdmin ? 'O\'quvchilar' : 'O\'quvchilarim'}</h1>
        <p className="mt-1 text-sm text-muted">
          {isAdmin ? 'Kurslarga' : 'Kurslaringizga'} yozilgan o'quvchilar va ularning progressi ({pagination?.total ?? 0})
        </p>
      </div>

      {/* Holat yorliqlari */}
      {summary && (
        <div className="mt-6 flex flex-wrap gap-2">
          {TABS.map((t) => {
            const active = status === t.key;
            return (
              <button
                key={t.key || 'all'}
                type="button"
                onClick={() => { setStatus(t.key); setPage(1); }}
                className={`rounded-xl px-3.5 py-2 text-sm font-medium transition-colors
                  ${active ? 'bg-primary text-white' : 'bg-slate-100 text-muted hover:bg-slate-200'}`}
              >
                {t.label}
                <span className={`ml-2 text-xs ${active ? 'text-white/70' : 'text-slate-400'}`}>
                  {summary[t.count] ?? 0}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Qidiruv, kurs filtri va saralash */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            className="input pl-9"
            placeholder="Ism yoki email bo'yicha qidirish..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {courses.length > 1 && (
          <select
            className="input max-w-[220px]"
            value={courseId}
            onChange={(e) => { setCourseId(e.target.value); setPage(1); }}
          >
            <option value="">Barcha kurslar</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        )}
        <select
          className="input max-w-[190px]"
          value={sort}
          onChange={(e) => { setSort(e.target.value); setPage(1); }}
        >
          <option value="recent">Yangi yozilganlar</option>
          <option value="progress">Progress bo'yicha</option>
          <option value="name">Ism bo'yicha</option>
        </select>
        {hasFilters && (
          <button type="button" onClick={clearFilters} className="btn-ghost">
            <X size={16} /> Tozalash
          </button>
        )}
      </div>

      <div className="mt-4">
        {error ? <ErrorState message={error} /> : loading ? <Spinner /> : students.length === 0 ? (
          <EmptyState
            title="O'quvchi topilmadi"
            text={hasFilters ? 'Qidiruv yoki filtrni o\'zgartirib ko\'ring.' : 'Kurslaringizga hali hech kim yozilmagan.'}
            icon={UsersIcon}
          />
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-line bg-slate-50 text-left text-xs uppercase text-muted">
                  <tr>
                    <th className="px-4 py-3">O'quvchi</th>
                    <th className="px-4 py-3">Kurs</th>
                    <th className="px-4 py-3 min-w-[160px]">Progress</th>
                    <th className="px-4 py-3">Oxirgi faollik</th>
                    <th className="px-4 py-3">Yozilgan</th>
                    <th className="px-4 py-3">Holat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {students.map((s) => {
                    const st = STATUS[s.status];
                    const last = relativeTime(s.lastActivityAt);
                    return (
                      <tr key={s.enrollmentId} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <Link
                            href={`/admin/students/${s.user.id}`}
                            className="flex items-center gap-2.5 hover:text-primary"
                          >
                            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-white">
                              {s.user.fullName?.charAt(0)?.toUpperCase()}
                            </span>
                            <span className="min-w-0">
                              <span className="block font-medium">{s.user.fullName}</span>
                              <span className="block text-xs text-muted">{s.user.email}</span>
                            </span>
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-muted">{s.course.title}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-200">
                              <div
                                className={`h-full rounded-full ${barColor(s.progress.percent)}`}
                                style={{ width: `${s.progress.percent}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium">{s.progress.percent}%</span>
                          </div>
                          <span className="mt-1 block text-xs text-muted">
                            {s.progress.completedLessons}/{s.progress.totalLessons} dars
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted">
                          {last || <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-muted">
                          {new Date(s.enrolledAt).toLocaleDateString('uz-UZ')}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`badge ${st.cls}`}><st.Icon size={12} /> {st.label}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {pagination && (
              <Pagination
                page={pagination.page}
                pages={pagination.pages}
                total={pagination.total}
                onChange={setPage}
                label="o'quvchi"
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
