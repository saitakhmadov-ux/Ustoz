'use client';

import { useEffect, useState } from 'react';
import { BookOpen, LayoutGrid, Users, Star } from 'lucide-react';
import { api } from '@/lib/api';

// Bosh sahifa uchun jonli koʻrsatkichlar (haqiqiy maʼlumotlardan)
export default function HomeStats() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get('/home/stats', { auth: false }).then((res) => setStats(res.stats)).catch(() => {});
  }, []);

  const items = [
    { key: 'courses', label: 'Kurslar', icon: BookOpen, value: stats ? `${stats.courses}` : '—' },
    { key: 'categories', label: "Yoʻnalishlar", icon: LayoutGrid, value: stats ? `${stats.categories}` : '—' },
    { key: 'students', label: "Oʻquvchilar", icon: Users, value: stats ? `${stats.students}+` : '—' },
    {
      key: 'rating', label: "Oʻrtacha baho", icon: Star,
      value: stats && stats.reviewCount > 0 ? stats.avgRating.toFixed(1) : '—',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((s) => {
        const Icon = s.icon;
        return (
          <div key={s.key} className="rounded-xl border border-indigo-100/70 bg-indigo-50/40 p-4">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-surface text-primary">
              <Icon size={17} />
            </span>
            <div className="mt-2.5 font-display text-2xl font-bold text-ink">{s.value}</div>
            <div className="text-xs text-muted">{s.label}</div>
          </div>
        );
      })}
    </div>
  );
}
