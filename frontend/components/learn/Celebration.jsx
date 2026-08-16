'use client';

import { useEffect, useState } from 'react';
import { Check, Trophy, ArrowRight } from 'lucide-react';
import Link from 'next/link';

// Dars yoki kurs yakunlanganda chiqadigan qisqa tantana.
//
// Klaviatura moduli uchun yozilgan konfetti animatsiyasi (globals.css ->
// .tp-confetti) shu yerda qayta ishlatiladi — sayt bo'ylab bitta til.
//
// kind='lesson' — 2.6 soniyada o'zi yopiladi, o'qishga xalaqit bermaydi.
// kind='course' — qo'lda yopiladi, chunki sertifikat havolasi bor.

const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#0ea5e9', '#a855f7'];

function Confetti({ count = 26 }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-0 overflow-visible">
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className="tp-confetti absolute block h-2 w-2 rounded-[2px]"
          style={{
            left: `${(i * 3.8 + 3) % 100}%`,
            backgroundColor: COLORS[i % COLORS.length],
            animationDelay: `${(i % 7) * 0.1}s`,
          }}
        />
      ))}
    </div>
  );
}

export default function Celebration({ celebration, certificate, onDone }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!celebration || celebration.kind === 'course') return undefined;
    const t1 = setTimeout(() => setLeaving(true), 2300);
    const t2 = setTimeout(() => { setLeaving(false); onDone(); }, 2800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [celebration, onDone]);

  if (!celebration) return null;

  const course = celebration.kind === 'course';

  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-none fixed inset-x-0 top-20 z-[70] flex justify-center px-4
        ${leaving ? 'opacity-0' : 'opacity-100'}`}
      style={{ transition: 'opacity 400ms ease' }}
    >
      <div className="relative">
        <Confetti count={course ? 40 : 26} />
        <div
          className={`tp-win-zoom pointer-events-auto flex items-center gap-3 rounded-2xl border px-5 py-3.5 shadow-card-hover
            ${course ? 'border-accent bg-emerald-50' : 'border-line bg-surface'}`}
        >
          <span
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl
              ${course ? 'bg-accent text-on-accent' : 'bg-accent text-on-accent'}`}
          >
            {course ? <Trophy size={20} /> : <Check size={20} strokeWidth={3} />}
          </span>

          <div className="min-w-0">
            <p className="font-display text-sm font-bold leading-tight text-heading">
              {course ? 'Kurs tugallandi!' : 'Dars yakunlandi'}
            </p>
            <p className="mt-0.5 text-xs text-muted">
              {course
                ? 'Sertifikatingiz tayyor.'
                : celebration.left > 0
                  ? `Yana ${celebration.left} ta dars qoldi.`
                  : 'Ajoyib ish!'}
            </p>
          </div>

          {course && certificate && (
            <Link href={`/certificates/${certificate.id}`} className="btn-accent shrink-0 py-1.5 text-xs">
              Sertifikat <ArrowRight size={14} />
            </Link>
          )}
          {course && (
            <button
              type="button"
              onClick={onDone}
              className="shrink-0 rounded-lg px-2 py-1 text-xs text-muted hover:text-ink"
            >
              Yopish
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
