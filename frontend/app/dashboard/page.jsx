'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BookOpen, Award, GraduationCap, Lock } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { LEVELS } from '@/lib/constants';
import RequireAuth from '@/components/RequireAuth';
import Reveal from '@/components/Reveal';
import AccessChip from '@/components/AccessChip';
import CourseCover from '@/components/CourseCover';
import { Spinner, ErrorState, EmptyState } from '@/components/ui';

function DashboardInner() {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState([]);
  const [stats, setStats] = useState({ enrollmentCount: 0, certificateCount: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.get('/enrollments/my'), api.get('/me/stats')])
      .then(([enrRes, statRes]) => {
        setEnrollments(enrRes.enrollments);
        setStats(statRes.stats);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="container-page py-10">
      {/* Salomlashuv */}
      <Reveal className="overflow-hidden rounded-3xl bg-gradient-to-br from-band-from via-band-from to-band-to px-7 py-8 text-white sm:px-9">
        <h1 className="text-3xl text-white">Salom, {user?.fullName?.split(' ')[0]} 👋</h1>
        <p className="mt-1.5 text-white/85">Oʻquv jarayoningizni davom ettiring va yangi choʻqqilarni zabt eting.</p>
      </Reveal>

      {/* Statistika */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Reveal delay={0} className="h-full">
          <div className="card flex h-full items-center gap-4 p-5">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-indigo-50 text-primary"><BookOpen size={22} /></span>
            <div>
              <div className="font-display text-2xl font-bold">{stats.enrollmentCount}</div>
              <div className="text-sm text-muted">Yozilgan kurslar</div>
            </div>
          </div>
        </Reveal>
        <Reveal delay={80} className="h-full">
          <div className="card flex h-full items-center gap-4 p-5">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-amber-50 text-amber-600"><Award size={22} /></span>
            <div>
              <div className="font-display text-2xl font-bold">{stats.certificateCount}</div>
              <div className="text-sm text-muted">Sertifikatlar</div>
            </div>
          </div>
        </Reveal>
        <Reveal delay={160} className="h-full">
          <Link href="/certificates" className="card flex h-full items-center gap-4 p-5 transition-all hover:shadow-card-hover hover:-translate-y-1">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-indigo-50 text-indigo-600"><GraduationCap size={22} /></span>
            <div>
              <div className="font-semibold">Sertifikatlarim</div>
              <div className="text-sm text-muted">Barchasini koʻrish →</div>
            </div>
          </Link>
        </Reveal>
      </div>

      {/* Kurslarim */}
      <h2 className="mt-10 text-2xl">Kurslarim</h2>
      <div className="mt-5">
        {error ? (
          <ErrorState message={error} />
        ) : loading ? (
          <Spinner />
        ) : enrollments.length === 0 ? (
          <EmptyState
            title="Hali kursga yozilmagansiz"
            text="Kurslar sahifasidan oʻzingizga mos kursni tanlang"
            icon={BookOpen}
          />
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {enrollments.map(({ id, course, progress, access }, i) => {
              const expired = access?.expired;
              return (
              <Reveal key={id} delay={(i % 3) * 70} className="h-full">
              <div className="card flex h-full flex-col overflow-hidden transition-all hover:shadow-card-hover">
                <div className="relative aspect-video bg-slate-100">
                  {course.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={course.thumbnail} alt="" className={`h-full w-full object-cover ${expired ? 'opacity-60 grayscale' : ''}`} />
                  ) : (
                    <CourseCover
                      title={course.title}
                      slug={course.slug}
                      className={expired ? 'opacity-60 grayscale' : ''}
                    />
                  )}
                  {expired && (
                    <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-red-500 px-2.5 py-1 text-xs font-medium text-white">
                      <Lock size={12} /> Muddat tugagan
                    </span>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <span className="text-xs font-medium text-primary">{course.category?.name}</span>
                  <h3 className="mt-1 line-clamp-2 font-display font-semibold leading-snug">{course.title}</h3>
                  <p className="text-sm text-muted">{course.authorName}</p>

                  {/* Progress + muddat */}
                  <div className="mt-3">
                    <div className="flex items-end justify-between">
                      <span className="text-sm text-muted">{progress.completedTasks ?? 0}/{progress.totalTasks ?? 0} vazifa</span>
                      <span className="font-display text-2xl font-bold leading-none text-primary">{progress.percent}%</span>
                    </div>
                    <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress.percent}%` }} />
                    </div>
                    <div className="mt-2.5 flex items-center justify-between">
                      <span className="text-sm text-muted">{progress.completedLessons ?? progress.completed}/{progress.totalLessons ?? progress.total} dars</span>
                      <AccessChip access={access} />
                    </div>
                  </div>

                  {expired ? (
                    <Link href={`/courses/${course.slug}`} className="btn-outline mt-4 w-full">
                      Qayta yozilish
                    </Link>
                  ) : (
                    <Link href={`/learn/${course.slug}`} className="btn-primary mt-4 w-full">
                      {progress.percent === 0 ? 'Boshlash' : progress.percent === 100 ? 'Takrorlash' : 'Davom etish'}
                    </Link>
                  )}
                </div>
              </div>
              </Reveal>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <RequireAuth>
      <DashboardInner />
    </RequireAuth>
  );
}
