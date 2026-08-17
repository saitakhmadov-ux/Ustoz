'use client';

// "Oʻquvchilar tahlili" — yozilishdan sertifikatgacha boʻlgan yoʻl va kurs kesimi.
// Bosh admin uchun Boshqaruv panelining ikkinchi yorligʻi, ustoz uchun /admin/stats sahifasi.
//
// Pul koʻrsatkichlari bu yerda takrorlanmaydi: aylanma "Umumiy koʻrsatkichlar"da,
// taqsimoti esa "Moliya" boʻlimida. Bu yerda faqat kurs kesimidagi daromad qoladi —
// u boshqa hech qayerda yoʻq.

import { useEffect, useState } from 'react';
import {
  Users, GraduationCap, Activity, UserX, CalendarDays, TrendingUp, BookOpen,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatPrice } from '@/lib/constants';
import { useAuth } from '@/lib/auth';
import { Spinner, ErrorState, EmptyState } from '@/components/ui';
import { StatCard, DataTable } from '@/components/admin/table';

const COLUMNS = [
  { label: 'Kurs' },
  { label: 'Yozildi', align: 'center' },
  { label: 'Faol', align: 'center' },
  { label: 'Tugatdi', align: 'center' },
  { label: 'Tugatmadi', align: 'center' },
  { label: 'Tugatish %', align: 'center' },
  { label: 'Daromad', align: 'right' },
];

// Funnel qatori — nisbatga qarab toʻldirilgan gorizontal bar
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

export default function StudentAnalytics({ showHeading = false }) {
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
        {showHeading && <h1 className="text-2xl">Statistika</h1>}
        <div className="mt-6">
          <EmptyState
            title="Statistika uchun kurs yoʻq"
            text="Sizga kurs biriktirilgach, oʻquvchilar boʻyicha koʻrsatkichlar shu yerda paydo boʻladi"
            icon={BookOpen}
          />
        </div>
      </div>
    );
  }

  const cards = [
    {
      label: "Yozilgan oʻquvchilar", value: t.enrolled, icon: Users, tone: 'blue',
      hint: 'Jami kursga yozilganlar',
      tip: 'Har bir yozilish alohida hisoblanadi: bitta odam ikki kursga yozilsa — ikkita.',
    },
    {
      label: 'Kursni tugatganlar', value: t.completed, icon: GraduationCap, tone: 'indigo',
      hint: `Sertifikat oldi · ${t.completionRate}%`,
      tip: 'Barcha darslarni tugatib, sertifikat olganlar.',
    },
    {
      label: "Faol oʻquvchilar", value: t.active, icon: Activity, tone: 'indigo',
      hint: 'Kamida 1 dars tugatgan',
      tip: 'Kursni ochib, hech boʻlmasa bitta darsni tugatgan oʻquvchilar.',
    },
    {
      label: 'Tugata olmaganlar', value: t.notCompleted, icon: UserX, tone: 'amber',
      hint: 'Yozilgan, ammo sertifikatsiz',
      tip: 'Boshlamaganlar ham, yarim yoʻlda toʻxtaganlar ham shu yerda.',
    },
    {
      label: 'Shu yildagi yozilishlar', value: t.enrolledThisYear, icon: CalendarDays, tone: 'rose',
      hint: String(new Date().getFullYear()),
      tip: 'Joriy kalendar yilida ochilgan yozilishlar.',
    },
  ];

  const maxYear = Math.max(1, ...stats.byYear.map((y) => y.count));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {showHeading ? (
          <div>
            <h1 className="text-2xl">Statistika</h1>
            <p className="mt-1 text-sm text-muted">
              {isAdmin
                ? "Barcha kurslar boʻyicha oʻquvchilar koʻrsatkichlari"
                : "Sizga biriktirilgan kurslar boʻyicha koʻrsatkichlar"}
            </p>
          </div>
        ) : <span />}
        <span className="badge bg-indigo-50 text-indigo-700">{t.courses} ta kurs</span>
      </div>

      {/* Umumiy kartochkalar */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((c) => (
          <StatCard
            key={c.label}
            icon={c.icon}
            tone={c.tone}
            value={c.value}
            label={c.label}
            hint={c.hint}
            tip={c.tip}
          />
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Oʻquvchilar yoʻnalishi (funnel) */}
        <div className="card p-5">
          <h2 className="flex items-center gap-2 text-lg">
            <TrendingUp size={18} className="text-primary" /> Oʻquvchilar yoʻnalishi
          </h2>
          <div className="mt-4 space-y-3">
            <FunnelBar label="Yozildi" value={t.enrolled} total={t.enrolled} color="bg-blue-500" />
            <FunnelBar label="Boshladi (faol)" value={t.active} total={t.enrolled} color="bg-indigo-500" />
            <FunnelBar label="Tugatdi (sertifikat)" value={t.completed} total={t.enrolled} color="bg-indigo-500" />
          </div>
          <p className="mt-4 text-xs text-muted">
            Yozilganlarning {t.completionRate}% i kursni toʻliq tugatgan.
          </p>
        </div>

        {/* Yillar boʻyicha yozilishlar */}
        <div className="card p-5">
          <h2 className="flex items-center gap-2 text-lg">
            <CalendarDays size={18} className="text-primary" /> Yillar boʻyicha yozilishlar
          </h2>
          {stats.byYear.length === 0 ? (
            <p className="mt-4 text-sm text-muted">Hali yozilishlar yoʻq</p>
          ) : (
            <div className="mt-6 flex items-end justify-around gap-4" style={{ height: 180 }}>
              {stats.byYear.map((y) => (
                <div key={y.year} className="flex flex-1 flex-col items-center justify-end gap-2">
                  <span className="text-sm font-bold text-ink">{y.count}</span>
                  {/* Brend tokeni, tekis rang — funnel barlari va "Dinamika"
                      grafigi bilan bir xil koʻrinish uchun */}
                  <div
                    className="w-full max-w-[56px] rounded-t-lg bg-primary transition-all"
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

      {/* Kurslar boʻyicha taqsimot */}
      <div className="mt-8">
        <h2 className="text-lg">Kurslar boʻyicha</h2>
        <div className="mt-3">
          <DataTable columns={COLUMNS}>
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
                <td className="px-4 py-3 text-right font-medium">
                  {c.isFree ? '—' : formatPrice(c.revenue)}
                </td>
              </tr>
            ))}
          </DataTable>
        </div>
      </div>
    </div>
  );
}
