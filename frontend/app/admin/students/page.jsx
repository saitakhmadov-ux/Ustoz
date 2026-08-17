'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Users as UsersIcon, GraduationCap, Clock, PlayCircle, CircleSlash } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useTableQuery } from '@/lib/useTableQuery';
import { Spinner, ErrorState, EmptyState, Pagination } from '@/components/ui';
import {
  PageHeader, DataToolbar, FilterSelect, CountTabs, DataTable, Avatar,
} from '@/components/admin/table';

// Yozilish holati — yorliq va rang
const STATUS = {
  completed: { label: 'Tugatgan', cls: 'bg-emerald-50 text-emerald-700', Icon: GraduationCap },
  inProgress: { label: 'Jarayonda', cls: 'bg-indigo-50 text-indigo-700', Icon: PlayCircle },
  notStarted: { label: 'Boshlamagan', cls: 'bg-slate-100 text-slate-600', Icon: CircleSlash },
  expired: { label: 'Muddati tugagan', cls: 'bg-amber-50 text-amber-700', Icon: Clock },
};

// Holat yorliqlari (chap tomondan oʻngga) — summaryʼdagi kalitlar bilan bir xil
const TABS = [
  { key: '', label: 'Barchasi', count: 'all' },
  { key: 'inProgress', label: 'Jarayonda', count: 'inProgress' },
  { key: 'notStarted', label: 'Boshlamagan', count: 'notStarted' },
  { key: 'completed', label: 'Tugatgan', count: 'completed' },
  { key: 'expired', label: 'Muddati tugagan', count: 'expired' },
];

const SORTS = [
  { value: 'recent', label: 'Yangi yozilganlar' },
  { value: 'progress', label: "Progress boʻyicha" },
  { value: 'name', label: "Ism boʻyicha" },
];

const COLUMNS = [
  { label: "Oʻquvchi" },
  { label: 'Kurs' },
  { label: 'Progress', minWidth: 160 },
  { label: 'Oxirgi faollik' },
  { label: 'Yozilgan' },
  { label: 'Holat' },
];

// Progress foiziga qarab rang: past — qizil, oʻrta — sabzi, yuqori — yashil
function barColor(percent) {
  if (percent >= 70) return 'bg-emerald-500';
  if (percent >= 30) return 'bg-amber-500';
  return 'bg-rose-500';
}

// "3 kun oldin" koʻrinishidagi nisbiy vaqt
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

  const t = useTableQuery({ filters: { q: '', courseId: '', status: '', sort: 'recent' } });

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/admin/teaching/students?${t.params}`)
      .then((res) => {
        setStudents(res.students);
        setCourses(res.courses);
        setSummary(res.summary);
        setPagination(res.pagination);
        setError('');
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [t.params]);

  useEffect(() => { load(); }, [load]);

  // Kurs biriktirilmagan ustoz uchun alohida holat
  if (!loading && !error && courses.length === 0) {
    return (
      <div>
        <h1 className="text-2xl">{isAdmin ? 'Oʻquvchilar' : 'Oʻquvchilarim'}</h1>
        <div className="mt-6">
          <EmptyState
            title="Hali kurs biriktirilmagan"
            text="Sizga kurs biriktirilgach, unga yozilgan oʻquvchilar shu yerda koʻrinadi."
            icon={UsersIcon}
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={isAdmin ? "Oʻquvchilar" : "Oʻquvchilarim"}
        subtitle={`${isAdmin ? 'Kurslarga' : 'Kurslaringizga'} yozilgan oʻquvchilar va ularning progressi (${pagination?.total ?? 0})`}
      />

      {summary && (
        <CountTabs
          value={t.values.status}
          onChange={(v) => t.set('status', v)}
          items={TABS.map((tab) => ({ ...tab, count: summary[tab.count] ?? 0 }))}
        />
      )}

      <DataToolbar
        search={t.search}
        onSearch={t.setSearch}
        placeholder="Ism yoki email boʻyicha qidirish..."
        hasFilters={t.hasFilters}
        onReset={t.reset}
      >
        {courses.length > 1 && (
          <FilterSelect
            value={t.values.courseId}
            onChange={(v) => t.set('courseId', v)}
            options={courses.map((c) => ({ value: c.id, label: c.title }))}
            placeholder="Barcha kurslar"
            width="220px"
          />
        )}
        <FilterSelect
          value={t.values.sort}
          onChange={(v) => t.set('sort', v)}
          options={SORTS}
        />
      </DataToolbar>

      <div className="mt-4">
        {error ? <ErrorState message={error} /> : loading ? <Spinner /> : students.length === 0 ? (
          <EmptyState
            title="Oʻquvchi topilmadi"
            text={t.hasFilters ? 'Qidiruv yoki filtrni oʻzgartirib koʻring.' : 'Kurslaringizga hali hech kim yozilmagan.'}
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
                label="oʻquvchi"
              />
            )}
          >
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
                      <Avatar name={s.user.fullName} />
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
          </DataTable>
        )}
      </div>
    </div>
  );
}
