'use client';

import { Star } from 'lucide-react';
import { useState } from 'react';

// Ko'rsatish rejimi — kasrli reytingni aniq to'ldiradi (masalan 4.4)
export function StarRating({ value = 0, size = 16, className = '' }) {
  const pct = Math.max(0, Math.min(100, (value / 5) * 100));
  return (
    <span className={`relative inline-flex align-middle ${className}`} aria-label={`${value} / 5`}>
      {/* Fon — bo'sh yulduzlar */}
      <span className="flex gap-0.5 text-slate-300">
        {[0, 1, 2, 3, 4].map((i) => <Star key={i} size={size} />)}
      </span>
      {/* To'ldirilgan qatlam — kenglik bo'yicha kesiladi */}
      <span
        className="absolute left-0 top-0 flex gap-0.5 overflow-hidden text-amber-400"
        style={{ width: `${pct}%` }}
      >
        {[0, 1, 2, 3, 4].map((i) => <Star key={i} size={size} fill="currentColor" className="shrink-0" />)}
      </span>
    </span>
  );
}

// Kichik reyting ko'rsatkichi: yulduzlar + o'rtacha (soni)
export function RatingBadge({ average = 0, count = 0, size = 14, showCount = true }) {
  if (!count) {
    return <span className="text-xs text-muted">Baho yo'q</span>;
  }
  return (
    <span className="inline-flex items-center gap-1.5">
      <StarRating value={average} size={size} />
      <span className="text-xs font-semibold text-ink">{average.toFixed(1)}</span>
      {showCount && <span className="text-xs text-muted">({count})</span>}
    </span>
  );
}

// Interaktiv baho tanlash (1..5)
export function StarInput({ value = 0, onChange, size = 30 }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          type="button"
          key={n}
          onMouseEnter={() => setHover(n)}
          onClick={() => onChange(n)}
          className="transition-transform hover:scale-110"
          aria-label={`${n} yulduz`}
        >
          <Star
            size={size}
            fill={n <= shown ? 'currentColor' : 'none'}
            className={n <= shown ? 'text-amber-400' : 'text-slate-300'}
          />
        </button>
      ))}
    </div>
  );
}
