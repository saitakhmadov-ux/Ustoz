'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { StarRating } from '@/components/Stars';

// Bosh sahifada hero ostida suzib turuvchi jonli ko'rsatkichlar bandi.
// Raqamlar oldinda — professional, sokin ko'rinish; hover'da jonlanadi.
export default function StatsBand() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get('/home/stats', { auth: false }).then((res) => setStats(res.stats)).catch(() => {});
  }, []);

  const hasRating = stats && stats.reviewCount > 0;
  const avg = hasRating ? stats.avgRating : 0;

  const items = [
    { key: 'courses', label: 'Onlayn kurslar', value: stats ? `${stats.courses}` : '—' },
    { key: 'categories', label: "Yo'nalishlar", value: stats ? `${stats.categories}` : '—' },
    { key: 'students', label: "Faol o'quvchilar", value: stats ? `${stats.students}+` : '—' },
  ];

  // Har bir katakcha uchun umumiy hover xatti-harakati (ko'tariladi)
  const cell =
    'group flex cursor-default flex-col items-center text-center transition-transform duration-300 ease-out hover:-translate-y-1 sm:px-4';
  // Katta raqam — hover'da kattalashadi va porlaydi
  const num =
    'font-display text-3xl font-bold text-primary transition-all duration-300 ease-out group-hover:scale-110 group-hover:[text-shadow:0_6px_20px_rgba(99,102,241,0.35)] md:text-4xl';

  return (
    <section className="container-page relative z-20 -mt-6 md:-mt-10">
      <div className="card grid grid-cols-2 gap-y-6 rounded-2xl p-6 shadow-card sm:grid-cols-4 sm:divide-x sm:divide-line sm:p-7">
        {items.map((s) => (
          <div key={s.key} className={cell}>
            <div className={num}>{s.value}</div>
            <div className="mt-1 text-sm text-muted transition-colors duration-300 group-hover:text-ink">
              {s.label}
            </div>
            {/* O'suvchi urg'u chizig'i */}
            <span className="mt-2 h-0.5 w-0 rounded-full bg-accent transition-all duration-300 ease-out group-hover:w-8" />
          </div>
        ))}

        {/* Reyting — raqam ostida "O'rtacha baho" o'rniga kurslardagidek yulduzlar */}
        <div className={cell} aria-label={hasRating ? `O'rtacha baho ${avg.toFixed(1)} / 5` : "Hali baho yo'q"}>
          <div className={num}>{hasRating ? avg.toFixed(1) : '—'}</div>
          {hasRating ? (
            <StarRating
              value={avg}
              size={17}
              className="mt-1.5 transition-transform duration-300 ease-out group-hover:scale-110"
            />
          ) : (
            <div className="mt-1 text-sm text-muted transition-colors duration-300 group-hover:text-ink">
              Hali baho yo'q
            </div>
          )}
          <span className="mt-2 h-0.5 w-0 rounded-full bg-amber-400 transition-all duration-300 ease-out group-hover:w-8" />
        </div>
      </div>
    </section>
  );
}
