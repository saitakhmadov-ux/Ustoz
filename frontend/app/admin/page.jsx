'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Users, BookOpen, GraduationCap, Wallet, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { api } from '@/lib/api';
import { formatPrice } from '@/lib/constants';
import { useAuth } from '@/lib/auth';
import { Spinner, ErrorState } from '@/components/ui';

const PERIODS = [
  { key: '7d', label: '7 kun' },
  { key: '30d', label: '30 kun' },
  { key: '90d', label: '90 kun' },
  { key: '1y', label: '1 yil' },
  { key: 'all', label: 'Butun davr' },
];

// O'sish belgisi — oldingi davrga nisbatan
function GrowthBadge({ value }) {
  if (value === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-muted">
        <Minus size={13} /> o'zgarishsiz
      </span>
    );
  }
  const up = value > 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${up ? 'text-emerald-600' : 'text-red-600'}`}>
      <Icon size={13} /> {up ? '+' : ''}{value}%
    </span>
  );
}

// Oddiy ustunli grafik (tashqi kutubxonasiz)
function BarChart({ data, color = 'var(--color-primary)', formatValue = (v) => v }) {
  if (!data || data.length === 0) {
    return <p className="py-10 text-center text-sm text-muted">Bu davrda ma'lumot yo'q</p>;
  }
  const max = Math.max(...data.map((d) => d.value), 1);
  // Ko'p nuqta bo'lsa faqat ba'zi yorliqlarni ko'rsatamiz
  const labelStep = Math.ceil(data.length / 8);

  return (
    <div className="mt-4">
      <div className="flex h-40 items-end gap-1">
        {data.map((d, i) => (
          <div key={d.date} className="group relative flex flex-1 flex-col justify-end" style={{ minWidth: 4 }}>
            <div
              className="rounded-t transition-opacity hover:opacity-80"
              style={{ height: `${Math.max(2, (d.value / max) * 100)}%`, background: color }}
            />
            {/* Sichqoncha ustida qiymat */}
            <span className="pointer-events-none absolute -top-7 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-ink px-2 py-1 text-xs text-white group-hover:block">
              {d.date}: {formatValue(d.value)}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-1 text-[10px] text-muted">
        {data.map((d, i) => (
          <span key={d.date} className="flex-1 truncate text-center" style={{ minWidth: 4 }}>
            {i % labelStep === 0 ? d.date.slice(5) : ''}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState('30d');
  const [chart, setChart] = useState('enrollments');

  // Ustoz bu sahifaga huquqsiz — o'z kurslariga yo'naltiramiz
  useEffect(() => {
    if (!authLoading && !isAdmin) router.replace('/admin/courses');
  }, [authLoading, isAdmin, router]);

  const load = useCallback(() => {
    if (authLoading || !isAdmin) return;
    setLoading(true);
    api.get(`/admin/stats?period=${period}`)
      .then((res) => { setStats(res.stats); setError(''); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [authLoading, isAdmin, period]);

  useEffect(() => { load(); }, [load]);

  if (!isAdmin) return <Spinner />;
  if (loading && !stats) return <Spinner />;
  if (error) return <ErrorState message={error} />;
  if (!stats) return null;

  const isAll = stats.period === 'all';

  // Davr bo'yicha ko'rsatkichlar (o'sish bilan)
  const periodCards = [
    { key: 'users', label: 'Yangi foydalanuvchi', value: stats.current.users, icon: Users, color: 'bg-blue-50 text-blue-600' },
    { key: 'enrollments', label: 'Yozilishlar', value: stats.current.enrollments, icon: GraduationCap, color: 'bg-indigo-50 text-indigo-600' },
    { key: 'sales', label: 'Sotuvlar', value: stats.current.sales, icon: BookOpen, color: 'bg-emerald-50 text-emerald-600' },
    { key: 'revenue', label: 'Daromad', value: formatPrice(stats.current.revenue), icon: Wallet, color: 'bg-amber-50 text-amber-600' },
  ];

  const CHARTS = {
    enrollments: { label: 'Yozilishlar', data: stats.charts.enrollments, format: (v) => v },
    users: { label: 'Yangi foydalanuvchilar', data: stats.charts.users, format: (v) => v },
    revenue: { label: 'Daromad', data: stats.charts.revenue, format: formatPrice },
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl">Boshqaruv paneli</h1>
          <p className="mt-1 text-sm text-muted">Platforma ko'rsatkichlari va dinamikasi</p>
        </div>

        {/* Davr tanlash */}
        <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors
                ${period === p.key ? 'bg-white text-primary shadow-sm' : 'text-muted hover:text-ink'}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Davr ko'rsatkichlari */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {periodCards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.key} className="card p-5">
              <span className={`grid h-11 w-11 place-items-center rounded-xl ${c.color}`}><Icon size={20} /></span>
              <div className="mt-3 font-display text-2xl font-bold">{c.value}</div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-muted">{c.label}</span>
                {!isAll && <GrowthBadge value={stats.growth[c.key]} />}
              </div>
            </div>
          );
        })}
      </div>
      {!isAll && (
        <p className="mt-2 text-xs text-muted">
          O'sish foizi oldingi shu uzunlikdagi davrga nisbatan hisoblanadi.
        </p>
      )}

      {/* Grafik */}
      <div className="card mt-6 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg">Dinamika</h2>
          <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
            {Object.entries(CHARTS).map(([key, c]) => (
              <button
                key={key}
                onClick={() => setChart(key)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors
                  ${chart === key ? 'bg-white text-primary shadow-sm' : 'text-muted hover:text-ink'}`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
        <BarChart data={CHARTS[chart].data} formatValue={CHARTS[chart].format} />
      </div>

      {/* Umumiy (butun davr) ko'rsatkichlari */}
      <div className="card mt-6 grid grid-cols-2 gap-y-4 p-5 sm:grid-cols-4 sm:divide-x sm:divide-line">
        {[
          { label: 'Jami foydalanuvchi', value: stats.users },
          { label: 'Kurslar (nashr/jami)', value: `${stats.publishedCourses}/${stats.courses}` },
          { label: 'Jami yozilish', value: stats.enrollments },
          { label: 'Umumiy daromad', value: formatPrice(stats.revenue) },
        ].map((s) => (
          <div key={s.label} className="text-center sm:px-3">
            <div className="font-display text-xl font-bold text-ink">{s.value}</div>
            <div className="mt-0.5 text-xs text-muted">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* So'nggi sotuvlar */}
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg">So'nggi sotuvlar</h2>
            <Link href="/admin/payments" className="text-sm text-primary hover:underline">Barchasi</Link>
          </div>
          <div className="mt-3 divide-y divide-line">
            {stats.recentPayments.length === 0 && <p className="py-4 text-sm text-muted">Hali sotuvlar yo'q</p>}
            {stats.recentPayments.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{p.course.title}</p>
                  <p className="text-xs text-muted">{p.user.fullName}</p>
                </div>
                <span className="shrink-0 font-semibold text-primary">{formatPrice(p.amount)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top kurslar */}
        <div className="card p-5">
          <h2 className="text-lg">Eng ommabop kurslar</h2>
          <div className="mt-3 divide-y divide-line">
            {stats.topCourses.length === 0 && <p className="py-4 text-sm text-muted">Ma'lumot yo'q</p>}
            {stats.topCourses.map((c, i) => (
              <div key={c.id} className="flex items-center justify-between py-3 text-sm">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-slate-100 text-xs font-bold">{i + 1}</span>
                  <p className="truncate font-medium">{c.title}</p>
                </div>
                <span className="shrink-0 text-xs text-muted">{c._count.enrollments} o'quvchi</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
