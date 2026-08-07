'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  PlayCircle, FileText, HelpCircle, ChevronDown, BarChart, Users,
  BookOpen, CheckCircle2, Lock, Loader2, Award, Clock,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { LEVELS, formatPrice, courseAccessMonthsLabel } from '@/lib/constants';
import { StarRating } from '@/components/Stars';
import CourseReviews from '@/components/CourseReviews';
import { Spinner, ErrorState } from '@/components/ui';

export default function CourseDetailPage() {
  const { slug } = useParams();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openSection, setOpenSection] = useState(0);
  const [enrolling, setEnrolling] = useState(false);

  const load = () => {
    setLoading(true);
    api.get(`/courses/${slug}`)
      .then((res) => setCourse(res.course))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [slug]);

  const handleEnroll = async () => {
    if (!isAuthenticated) {
      router.push(`/login?next=/courses/${slug}`);
      return;
    }
    if (course.isEnrolled) {
      router.push(`/learn/${slug}`);
      return;
    }
    if (!course.isFree && course.price > 0) {
      router.push(`/checkout/${slug}`);
      return;
    }
    // Bepul kursga yozilish
    setEnrolling(true);
    try {
      await api.post('/enrollments', { courseId: course.id });
      router.push(`/learn/${slug}`);
    } catch (err) {
      setError(err.message);
      setEnrolling(false);
    }
  };

  if (loading) return <Spinner />;
  if (error) return <div className="container-page py-10"><ErrorState message={error} /></div>;
  if (!course) return null;

  return (
    <div>
      {/* Hero */}
      <section className="bg-ink text-white">
        <div className="container-page grid gap-8 py-12 lg:grid-cols-[1fr_380px]">
          <div>
            <Link href={`/categories/${course.category?.slug}`} className="text-sm font-medium text-indigo-300 hover:underline">
              {course.category?.name}
            </Link>
            <h1 className="mt-3 text-3xl text-white md:text-4xl">{course.title}</h1>
            <p className="mt-4 max-w-2xl text-slate-300">{course.description}</p>
            <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-slate-300">
              {course.rating?.count > 0 && (
                <span className="flex items-center gap-1.5">
                  <StarRating value={course.rating.average} size={16} />
                  <span className="font-semibold text-amber-300">{course.rating.average.toFixed(1)}</span>
                  <span className="text-slate-400">({course.rating.count})</span>
                </span>
              )}
              <span className="flex items-center gap-1.5"><BarChart size={16} /> {LEVELS[course.level]}</span>
              <span className="flex items-center gap-1.5"><BookOpen size={16} /> {course.lessonCount} dars</span>
              <span className="flex items-center gap-1.5"><Users size={16} /> {course._count?.enrollments ?? 0} o'quvchi</span>
              <span className="flex items-center gap-1.5"><Award size={16} /> Sertifikat</span>
            </div>
            <p className="mt-4 text-sm text-slate-400">Muallif: <span className="text-white">{course.authorName}</span></p>
          </div>

          {/* Yon panel — narx va yozilish */}
          <div className="lg:-mb-24">
            <div className="card overflow-hidden p-0 text-ink">
              <div className="aspect-video bg-slate-100">
                {course.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={course.thumbnail} alt={course.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-slate-300"><PlayCircle size={48} /></div>
                )}
              </div>
              <div className="p-6">
                <div className="font-display text-3xl font-bold">
                  {formatPrice(course.price, course.isFree)}
                </div>
                <button onClick={handleEnroll} disabled={enrolling} className="btn-primary mt-4 w-full">
                  {enrolling && <Loader2 size={16} className="animate-spin" />}
                  {course.isEnrolled
                    ? 'Kursni davom ettirish'
                    : course.isFree
                      ? 'Bepul yozilish'
                      : 'Kursni sotib olish'}
                </button>
                <ul className="mt-5 space-y-2 text-sm text-muted">
                  <li className="flex items-center gap-2"><Clock size={16} className="text-primary" /> Foydalanish muddati: <span className="font-medium text-ink">{courseAccessMonthsLabel(course)}</span></li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-primary" /> {course.lessonCount} ta video dars</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-primary" /> Yakuniy sertifikat</li>
                </ul>
                <p className="mt-3 text-xs text-muted">
                  Kurs {courseAccessMonthsLabel(course)} davomida ochiq bo'ladi. Muddat tugagach kursga qayta yozilish mumkin.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Dastur (curriculum) */}
      <section className="container-page py-12 lg:pt-32">
        <div className="max-w-3xl">
          <h2 className="text-2xl">Kurs dasturi</h2>
          <p className="mt-1 text-sm text-muted">
            {course.sections.length} bo'lim · {course.lessonCount} dars
          </p>

          <div className="mt-6 space-y-3">
            {course.sections.length === 0 && (
              <p className="text-sm text-muted">Bu kursga hali darslar qo'shilmagan.</p>
            )}
            {course.sections.map((section, idx) => {
              const isOpen = openSection === idx;
              return (
                <div key={section.id} className="card overflow-hidden">
                  <button
                    onClick={() => setOpenSection(isOpen ? -1 : idx)}
                    className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left hover:bg-slate-50"
                  >
                    <span className="font-semibold">
                      {idx + 1}. {section.title}
                    </span>
                    <span className="flex items-center gap-3 text-sm text-muted">
                      {section.lessons.length} dars
                      <ChevronDown size={18} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </span>
                  </button>
                  {isOpen && (
                    <ul className="border-t border-line">
                      {section.lessons.map((lesson) => {
                        const canView = course.isEnrolled || course.isFree || lesson.isFreePreview;
                        return (
                          <li key={lesson.id} className="flex items-center gap-3 border-b border-line px-5 py-3 last:border-0">
                            {lesson.videoUrl ? <PlayCircle size={18} className="text-primary" /> : <FileText size={18} className="text-muted" />}
                            <span className="flex-1 text-sm">{lesson.title}</span>
                            {lesson.questionCount > 0 && (
                              <span className="flex items-center gap-1 text-xs text-muted"><HelpCircle size={13} /> test</span>
                            )}
                            {lesson.isFreePreview && !course.isEnrolled && (
                              <span className="badge bg-indigo-50 text-indigo-700">Bepul</span>
                            )}
                            {!canView && <Lock size={14} className="text-slate-400" />}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Baholar va sharhlar */}
      <section className="border-t border-line bg-slate-50/50">
        <div className="container-page py-12">
          <div className="max-w-4xl">
            <h2 className="text-2xl">Baholar va sharhlar</h2>
            <p className="mt-1 text-sm text-muted">O'quvchilarning kurs haqidagi fikrlari</p>
            <div className="mt-6">
              <CourseReviews slug={slug} />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
