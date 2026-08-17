'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Quote } from 'lucide-react';
import { api } from '@/lib/api';
import { StarRating } from '@/components/Stars';
import Reveal from '@/components/Reveal';

// Real foydalanuvchi sharhlari (izohli, 4+ yulduz)
export default function Testimonials({ limit = 6 }) {
  const [reviews, setReviews] = useState(null);

  useEffect(() => {
    api.get(`/home/reviews?limit=${limit}`, { auth: false })
      .then((res) => setReviews(res.reviews))
      .catch(() => setReviews([]));
  }, [limit]);

  // Sharh boʻlmasa boʻlimni koʻrsatmaymiz
  if (!reviews || reviews.length === 0) return null;

  return (
    <section className="bg-indigo-50/40 py-16 sm:py-20">
      <div className="container-page">
        <Reveal className="mx-auto mb-10 max-w-2xl text-center">
          <h2 className="text-3xl">Oʻquvchilar nima deydi</h2>
          <p className="mt-2 text-muted">Haqiqiy oʻquvchilarning kurslar haqidagi fikrlari</p>
        </Reveal>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {reviews.map((r, i) => (
            <Reveal key={r.id} delay={(i % 3) * 80}>
              <figure className="flex h-full flex-col rounded-2xl border border-line bg-surface p-6 shadow-card">
                <Quote size={22} className="text-indigo-200" fill="currentColor" />
                <blockquote className="mt-3 flex-1 text-[15px] leading-relaxed text-ink/90">
                  “{r.comment}”
                </blockquote>
                <div className="mt-4 border-t border-line pt-4">
                  <StarRating value={r.rating} size={14} />
                  <figcaption className="mt-2 flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-primary text-xs font-bold text-on-primary">
                      {r.user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{r.user?.fullName}</span>
                      <Link href={`/courses/${r.course?.slug}`} className="block truncate text-xs text-muted hover:text-primary">
                        {r.course?.title}
                      </Link>
                    </span>
                  </figcaption>
                </div>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
