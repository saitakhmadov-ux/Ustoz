'use client';

import { Clock, AlarmClock } from 'lucide-react';
import { formatDaysLeft } from '@/lib/constants';

// Kursdan foydalanish muddati ko'rsatkichi. Rang qolgan vaqtning umumiy muddatga
// nisbatiga qarab o'zgaradi: boshida yashil → yarmida sabzi/orange → oxirida qizil.
// Muddatsiz bo'lsa hech narsa chizmaydi.
export default function AccessChip({ access, className = '' }) {
  const info = formatDaysLeft(access);
  if (!info) return null;
  const tone =
    info.tone === 'red' ? 'bg-red-50 text-red-700 ring-red-200'
      : info.tone === 'amber' ? 'bg-orange-50 text-orange-700 ring-orange-200'
        : 'bg-emerald-50 text-emerald-700 ring-emerald-200';
  const Icon = info.tone === 'red' ? AlarmClock : Clock;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold ring-1 ${tone} ${className}`}>
      <Icon size={16} /> {info.label}
    </span>
  );
}
