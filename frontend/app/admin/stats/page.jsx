'use client';

import { useEffect, useState } from 'react';
import {
  Users, GraduationCap, Activity, UserX, Wallet, CalendarDays, TrendingUp, BookOpen,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatPrice } from '@/lib/constants';
import { useAuth } from '@/lib/auth';
import { Spinner, ErrorState, EmptyState } from '@/components/ui';

export default function TeachingStatsPage() {
  const { isAdmin } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/admin/teaching/stats')
      .then((res) => setStats(res.stats))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} />;
  if (!stats) return null;

  const t = stats.totals;

  if (t.courses === 0) {
    return (
      <div>
        <h1 className="text-2xl">Statistika</h1>
        <div className="mt-6">
          <EmptyState
            title="Statistika uchun kurs yo'q"
            text="Sizga kurs biriktirilgach, o'quvchilar bo'yicha ko'rsatkichlar shu yerda paydo bo'ladi"
            icon={BookOpen}
          />
        </div>
      </div>
    );
  }

  const cards = [
    { label: 'Yozilgan o\'quvchilar', value: t.enrolled, icon: Users, color: 'bg-blue-50 text-blue-600', hint: 'Jami kursga yozilganlar' },
    { label: 'Kursni tugatganlar', value: t.completed, icon: GraduationCap, color: 'bg-indigo-50 text-indigo-600', hint: `Sertifikat oldi · ${t.completionRate}%` },
    { label: 'Faol o\'quvchilar', value: t.active, icon: Activity, color: 'bg-indigo-50 text-indigo-600', hint: 'Kamida 1 dars tugatgan' },
    { label: 'Tugata olmaganlar', value: t.notCompleted, icon: UserX, color: 'bg-amber-50 text-amber-600', hint: 'Yozilgan, ammo sertifikatsiz' },
    { label: 'Daromad', value: formatPrice(t.revenue), icon: Wallet, color: 'bg-emerald-50 text-emerald-600', hint: `${t.sales} ta sotuv` },
    { label: 'Shu yildagi yozilishlar', value: t.enrolledThisYear, icon: CalendarDays, color: 'bg-rose-50 text-rose-600', hint: String(new Date().getFullYear()) },
  ];

  const maxYear = Math.max(1, ...stats.byYear.map((y) => y.count));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl">Statistika</h1>
          <p className="mt-1 text-sm text-muted">
            {isAdmin ? 'Barcha kurslar bo\'yicha o\'quvchilar ko\'rsatkichlari' : 'Sizga biriktirilgan kurslar bo\'yicha ko\'rsatkichlar'}
          </p>
        </div>
        <span className="badge bg-indigo-50 text-indigo-700">{t.courses} ta kurs</span>
      </div>

      {/* Umumiy kartochkalar */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="card p-5">
              <div className="flex items-start justify-between">
                <span className={`grid h-11 w-11 place-items-center rounded-xl ${c.color}`}><Icon size={20} /></span>
              </div>
              <div className="mt-3 font-display text-2xl font-bold">{c.value}</div>
              <div className="text-sm font-medium text-ink">{c.label}</div>
              <div className="mt-0.5 text-xs text-muted">{c.hint}</div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* O'quvchilar yo'nalishi (funnel) */}
        <div className="card p-5">
          <h2 className="flex items-center gap-2 text-lg"><TrendingUp size={18} className="text-primary" /> O'quvchilar yo'nalishi</h2>
          <div className="mt-4 space-y-3">
            <FunnelBar label="Yozildi" value={t.enrolled} total={t.enrolled} color="bg-blue-500" />
            <FunnelBar label="Boshladi (faol)" value={t.active} total={t.enrolled} color="bg-indigo-500" />
            <FunnelBar label="Tugatdi (sertifikat)" value={t.completed} total={t.enrolled} color="bg-indigo-500" />
          </div>
          <p className="mt-4 text-xs text-muted">
            Yozilganlarning {t.completionRate}% i kursni to'liq tugatgan.
          </p>
        </div>

        {/* Yillar bo'yicha yozilishlar */}
        <div className="card p-5">
          <h2 className="flex items-center gap-2 text-lg"><CalendarDays size={18} className="text-primary" /> Yillar bo'yicha yozilishlar</h2>
          {stats.byYear.length === 0 ? (
            <p className="mt-4 text-sm text-muted">Hali yozilishlar yo'q</p>
          ) : (
            <div className="mt-6 flex items-end justify-around gap-4" style={{ height: 180 }}>
              {stats.byYear.map((y) => (
                <div key={y.year} className="flex flex-1 flex-col items-center justify-end gap-2">
                  <span className="text-sm font-bold text-ink">{y.count}</span>
                  <div
                    className="w-full max-w-[56px] rounded-t-lg bg-gradient-to-t from-indigo-600 to-indigo-400 transition-all"
                    style={{ height: `${Math.round((y.count / maxYear) * 140)}px` }}
                    title={`${y.year}: ${y.count} yozilish`}
                  />
                  <span className="text-xs text-muted">{y.year}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Kurslar bo'yicha taqsimot */}
      <div className="mt-8">
        <h2 className="text-lg">Kurslar bo'yicha</h2>
        <div className="card mt-3 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-line bg-slate-50 text-left text-xs uppercase text-muted">
                <tr>
                  <th className="px-4 py-3">Kurs</th>
                  <th className="px-4 py-3 text-center">Yozildi</th>
                  <th className="px-4 py-3 text-center">Faol</th>
                  <th className="px-4 py-3 text-center">Tugatdi</th>
                  <th className="px-4 py-3 text-center">Tugatmadi</th>
                  <th className="px-4 py-3 text-center">Tugatish %</th>
                  <th className="px-4 py-3 text-right">Daromad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {stats.courses.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium">{c.title}</p>
                      <p className="text-xs text-muted">
                        {c.published ? 'Nashr etilgan' : 'Qoralama'} · {c.isFree ? 'Bepul' : formatPrice(c.price)}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-center font-medium">{c.enrolled}</td>
                    <td className="px-4 py-3 text-center text-indigo-600">{c.active}</td>
                    <td className="px-4 py-3 text-center text-indigo-600">{c.completed}</td>
                    <td className="px-4 py-3 text-center text-amber-600">{c.notCompleted}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="badge bg-slate-100 text-slate-700">{c.completionRate}%</span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{c.isFree ? '—' : formatPrice(c.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// Funnel qatori — nisbatga qarab to'ldirilgan gorizontal bar
function FunnelBar({ label, value, total, color }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="font-medium text-ink">{label}</span>
        <span className="text-muted">{value} ({pct}%)</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
