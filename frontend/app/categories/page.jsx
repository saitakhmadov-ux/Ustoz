'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { RatingBadge } from '@/components/Stars';
import Reveal from '@/components/Reveal';
import TiltCard from '@/components/TiltCard';
import { Spinner, ErrorState, EmptyState } from '@/components/ui';

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/categories', { auth: false })
      .then((res) => setCategories(res.categories))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="container-page py-10">
      <Reveal className="mb-8">
        <h1 className="text-3xl">Kategoriyalar</h1>
        <p className="mt-2 text-muted">Yoʻnalishni tanlang va shu sohadagi kurslarni koʻring</p>
      </Reveal>

      {error ? (
        <ErrorState message={error} />
      ) : loading ? (
        <Spinner />
      ) : categories.length === 0 ? (
        <EmptyState title="Kategoriyalar yoʻq" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c, i) => (
            <Reveal key={c.slug} delay={(i % 3) * 60} className="h-full">
            <TiltCard className="h-full">
            <Link
              href={`/categories/${c.slug}`}
              className="card group flex h-full items-start gap-4 p-6 transition-[border-color,box-shadow] hover:border-indigo-200 hover:shadow-card-hover"
            >
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-indigo-50 text-2xl transition-transform group-hover:scale-110">
                {c.icon || '📚'}
              </span>
              <div>
                <h3 className="font-display text-lg font-semibold group-hover:text-primary">{c.name}</h3>
                {c.description && <p className="mt-1 text-sm text-muted line-clamp-2">{c.description}</p>}
                <div className="mt-2 flex items-center gap-3">
                  <p className="text-xs font-medium text-primary">{c.courseCount} ta kurs</p>
                  {c.rating?.count > 0 || c.rating?.ratedCourses > 0 ? (
                    <RatingBadge average={c.rating.average} count={c.rating.ratedCourses} showCount={false} />
                  ) : null}
                </div>
              </div>
            </Link>
            </TiltCard>
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}
