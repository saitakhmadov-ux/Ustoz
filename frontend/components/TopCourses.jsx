'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Star } from 'lucide-react';
import { api } from '@/lib/api';
import CourseCard from '@/components/CourseCard';
import { SkeletonCard } from '@/components/ui';

// Bosh sahifa uchun eng yuqori baholi kurslar boʻlimi
export default function TopCourses({ limit = 4 }) {
  const [courses, setCourses] = useState(null); // null = yuklanmoqda
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/courses/top?limit=${limit}`, { auth: false })
      .then((res) => setCourses(res.courses))
      .catch(() => setCourses([]))
      .finally(() => setLoading(false));
  }, [limit]);

  // Baholangan kurs boʻlmasa boʻlimni koʻrsatmaymiz
  if (!loading && (!courses || courses.length === 0)) return null;

  return (
    <section className="bg-surface py-16">
      <div className="container-page">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-3xl">
              <Star size={26} className="text-amber-400" fill="currentColor" /> Eng yuqori baholi kurslar
            </h2>
            <p className="mt-2 text-muted">Oʻquvchilar eng yuqori baholagan kurslar</p>
          </div>
          <Link href="/courses" className="hidden shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline sm:flex">
            Barcha kurslar <ArrowRight size={16} />
          </Link>
        </div>

        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: limit }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {courses.map((c) => <CourseCard key={c.id} course={c} />)}
          </div>
        )}
      </div>
    </section>
  );
}
