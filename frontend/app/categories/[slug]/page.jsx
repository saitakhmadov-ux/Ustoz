'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import CourseCard from '@/components/CourseCard';
import { RatingBadge } from '@/components/Stars';
import Reveal from '@/components/Reveal';
import { Spinner, ErrorState, EmptyState } from '@/components/ui';

export default function CategoryPage() {
  const { slug } = useParams();
  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    api.get(`/categories/${slug}`, { auth: false })
      .then((res) => setCategory(res.category))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <Spinner />;
  if (error) return <div className="container-page py-10"><ErrorState message={error} /></div>;
  if (!category) return null;

  return (
    <div className="container-page py-10">
      <Reveal className="mb-8 flex items-center gap-4">
        <span className="grid h-16 w-16 place-items-center rounded-2xl bg-indigo-50 text-3xl">
          {category.icon || '📚'}
        </span>
        <div>
          <h1 className="text-3xl">{category.name}</h1>
          {category.description && <p className="mt-1 text-muted">{category.description}</p>}
          {category.rating?.ratedCourses > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <RatingBadge average={category.rating.average} count={category.rating.ratedCourses} showCount={false} />
              <span className="text-xs text-muted">· {category.rating.ratedCourses} ta baholangan kurs</span>
            </div>
          )}
        </div>
      </Reveal>

      {category.courses.length === 0 ? (
        <EmptyState title="Bu yo'nalishda hali kurs yo'q" text="Tez orada qo'shiladi" />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {category.courses.map((c, i) => (
            <Reveal key={c.id} delay={(i % 4) * 60} className="h-full">
              <CourseCard course={c} />
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}
