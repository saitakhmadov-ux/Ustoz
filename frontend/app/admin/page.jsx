'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, BookOpen, GraduationCap, Wallet } from 'lucide-react';
import { api } from '@/lib/api';
import { formatPrice } from '@/lib/constants';
import { useAuth } from '@/lib/auth';
import { Spinner, ErrorState } from '@/components/ui';

export default function AdminDashboard() {
  const { isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Ustoz bu sahifaga huquqsiz — o'z kurslariga yo'naltiramiz
  useEffect(() => {
    if (!authLoading && !isAdmin) router.replace('/admin/courses');
  }, [authLoading, isAdmin, router]);

  useEffect(() => {
    if (authLoading || !isAdmin) return;
    api.get('/admin/stats')
      .then((res) => setStats(res.stats))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [authLoading, isAdmin]);

  if (!isAdmin) return <Spinner />;
  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} />;

  const cards = [
    { label: 'Foydalanuvchilar', value: stats.users, icon: Users, color: 'bg-blue-50 text-blue-600' },
    { label: 'Kurslar', value: `${stats.publishedCourses}/${stats.courses}`, icon: BookOpen, color: 'bg-indigo-50 text-indigo-600' },
    { label: 'Yozilishlar', value: stats.enrollments, icon: GraduationCap, color: 'bg-indigo-50 text-indigo-600' },
    { label: 'Daromad', value: formatPrice(stats.revenue), icon: Wallet, color: 'bg-amber-50 text-amber-600' },
  ];

  return (
    <div>
      <h1 className="text-2xl">Boshqaruv paneli</h1>
      <p className="mt-1 text-sm text-muted">Platforma umumiy ko'rsatkichlari</p>

      {/* Statistika kartochkalari */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="card p-5">
              <span className={`grid h-11 w-11 place-items-center rounded-xl ${c.color}`}><Icon size={20} /></span>
              <div className="mt-3 font-display text-2xl font-bold">{c.value}</div>
              <div className="text-sm text-muted">{c.label}</div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* So'nggi sotuvlar */}
        <div className="card p-5">
          <h2 className="text-lg">So'nggi sotuvlar</h2>
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
