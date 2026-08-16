'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, SlidersHorizontal } from 'lucide-react';
import { api } from '@/lib/api';
import { LEVELS } from '@/lib/constants';
import CourseCard from '@/components/CourseCard';
import Reveal from '@/components/Reveal';
import { SkeletonCard, EmptyState, ErrorState, Spinner } from '@/components/ui';

function CoursesInner() {
  const searchParams = useSearchParams();
  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filtrlar
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [level, setLevel] = useState('');
  const [onlyFree, setOnlyFree] = useState(false);

  // URL dagi ?search o'zgarsa (masalan navbardan qidirilsa) sinxronlaymiz
  useEffect(() => {
    setSearch(searchParams.get('search') || '');
    const cat = searchParams.get('category');
    if (cat) setCategory(cat);
  }, [searchParams]);

  useEffect(() => {
    api.get('/categories', { auth: false })
      .then((res) => setCategories(res.categories))
      .catch(() => {});
  }, []);

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (category) params.set('category', category);
      if (level) params.set('level', level);
      if (onlyFree) params.set('isFree', 'true');
      const res = await api.get(`/courses?${params.toString()}`, { auth: false });
      setCourses(res.courses);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [search, category, level, onlyFree]);

  // Filtr o'zgarganda qayta yuklash (qidiruv uchun debounce)
  useEffect(() => {
    const t = setTimeout(fetchCourses, 300);
    return () => clearTimeout(t);
  }, [fetchCourses]);

  return (
    <div className="container-page py-10">
      <Reveal className="mb-8">
        <h1 className="text-3xl">Barcha kurslar</h1>
        <p className="mt-2 text-muted">O'zingizga mos kursni toping va o'rganishni boshlang</p>
      </Reveal>

      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        {/* Filtrlar paneli */}
        <aside className="space-y-6 lg:sticky lg:top-20 lg:self-start">
          <div className="card p-5">
            <div className="mb-3 flex items-center gap-2 font-semibold">
              <SlidersHorizontal size={18} /> Filtrlar
            </div>

            {/* Qidiruv */}
            <div className="relative mb-5">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
              <input
                className="input pl-9"
                placeholder="Qidirish..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Kategoriya */}
            <div className="mb-5">
              <div className="label">Kategoriya</div>
              <div className="space-y-1">
                <button
                  onClick={() => setCategory('')}
                  className={`block w-full rounded-lg px-3 py-1.5 text-left text-sm ${category === '' ? 'bg-indigo-50 font-medium text-primary' : 'hover:bg-slate-100'}`}
                >
                  Barchasi
                </button>
                {categories.map((c) => (
                  <button
                    key={c.slug}
                    onClick={() => setCategory(c.slug)}
                    className={`block w-full rounded-lg px-3 py-1.5 text-left text-sm ${category === c.slug ? 'bg-indigo-50 font-medium text-primary' : 'hover:bg-slate-100'}`}
                  >
                    {c.icon} {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Daraja */}
            <div className="mb-5">
              <div className="label">Daraja</div>
              <select className="input" value={level} onChange={(e) => setLevel(e.target.value)}>
                <option value="">Barchasi</option>
                {Object.entries(LEVELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            {/* Bepul */}
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={onlyFree}
                onChange={(e) => setOnlyFree(e.target.checked)}
                className="h-4 w-4 rounded border-line text-primary focus:ring-primary"
              />
              Faqat bepul kurslar
            </label>
          </div>
        </aside>

        {/* Kurslar to'ri */}
        <div>
          {error ? (
            <ErrorState message={error} />
          ) : loading ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : courses.length === 0 ? (
            <EmptyState title="Kurs topilmadi" text="Filtrlarni o'zgartirib ko'ring" />
          ) : (
            <>
              <p className="mb-4 text-sm text-muted">{courses.length} ta kurs topildi</p>
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {courses.map((c, i) => (
                  <Reveal key={c.id} delay={(i % 3) * 70} className="h-full">
                    <CourseCard course={c} />
                  </Reveal>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CoursesPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <CoursesInner />
    </Suspense>
  );
}
