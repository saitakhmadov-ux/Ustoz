'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

// Bosh sahifada hero ostida suzib turuvchi jonli ko'rsatkichlar bandi.
// Raqamlar oldinda — professional, sokin ko'rinish.
export default function StatsBand() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get('/home/stats', { auth: false }).then((res) => setStats(res.stats)).catch(() => {});
  }, []);

  const items = [
    { key: 'courses', label: 'Onlayn kurslar', value: stats ? `${stats.courses}` : '—' },
    { key: 'categories', label: "Yo'nalishlar", value: stats ? `${stats.categories}` : '—' },
    { key: 'students', label: "Faol o'quvchilar", value: stats ? `${stats.students}+` : '—' },
    {
      key: 'rating', label: "O'rtacha baho",
      value: stats && stats.reviewCount > 0 ? stats.avgRating.toFixed(1) : '—',
    },
  ];

  return (
    <section className="container-page relative z-20 -mt-6 md:-mt-10">
      <div className="card grid grid-cols-2 gap-y-6 rounded-2xl p-6 shadow-card sm:grid-cols-4 sm:divide-x sm:divide-line sm:p-7">
        {items.map((s) => (
          <div key={s.key} className="flex flex-col items-center text-center sm:px-4">
            <div className="font-display text-3xl font-bold text-primary md:text-4xl">{s.value}</div>
            <div className="mt-1 text-sm text-muted">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
