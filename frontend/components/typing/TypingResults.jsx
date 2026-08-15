'use client';

// Mashq yakunlangandan keyingi natija paneli.
// Maqsadga yetilgan bo'lsa dars yakunlanadi va keyingisiga o'tish tugmasi chiqadi.
//
// O'ng tomonda — yulduzchali baho: aniqlik va maqsadli tezlikka yetish
// darajasidan chiqadigan umumiy foiz (lib/typing.js -> scoreOf/starsOf).
// Animatsiya uslubi darsga qarab o'zgaradi (styleFor).

import Link from 'next/link';
import {
  Trophy, RotateCcw, ArrowRight, Award, Target,
} from 'lucide-react';
import { StarRating } from '@/components/Stars';
import { scoreOf, starsOf, starLabel } from '@/lib/typing';

// Tantana uchun konfetti bo'lakchalari — faqat shu uslubdagi darslarda
const CONFETTI = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#0ea5e9', '#a855f7'];

function Confetti() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-0 overflow-visible">
      {Array.from({ length: 18 }).map((_, i) => (
        <span
          key={i}
          className="tp-confetti absolute block h-2 w-2 rounded-[2px]"
          style={{
            left: `${(i * 5.5 + 4) % 100}%`,
            backgroundColor: CONFETTI[i % CONFETTI.length],
            animationDelay: `${(i % 6) * 0.12}s`,
          }}
        />
      ))}
    </div>
  );
}

function Stat({ value, label, good = null }) {
  return (
    <div className="rounded-xl border border-line bg-white p-4 text-center">
      <p className={`font-display text-3xl font-bold ${good === null ? 'text-ink' : good ? 'text-emerald-600' : 'text-amber-600'}`}>
        {value}
      </p>
      <p className="mt-0.5 text-xs text-muted">{label}</p>
    </div>
  );
}

export default function TypingResults({
  result, target, certificate, onRetry, onNext, hasNext, anim = {},
}) {
  const passed = result.passed;
  const score = scoreOf(result, target);
  const stars = starsOf(score);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-6 ${anim.win || ''}
        ${passed ? 'border-emerald-200 bg-emerald-50/60' : 'border-amber-200 bg-amber-50/60'}`}
    >
      {passed && anim.confetti && <Confetti />}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${passed ? 'bg-emerald-600' : 'bg-amber-500'} text-white`}>
            {passed ? <Trophy size={22} /> : <Target size={22} />}
          </span>
          <div>
            <h3 className="font-display text-lg font-semibold text-ink">
              {passed ? 'Dars yakunlandi!' : 'Maqsadga yetmadi'}
            </h3>
            <p className="text-sm text-muted">
              {passed
                ? 'Maqsadli tezlik va aniqlikka yetdingiz.'
                : `Kerak: ${target.wpm} so'z/daqiqa va ${target.accuracy}% aniqlik. Qayta urinib ko'ring — urinishlar soni cheklanmagan.`}
            </p>
          </div>
        </div>

        {/* Baho — sarlavha yonidagi bo'sh joyda */}
        <div className="tp-star-in flex items-center gap-3 rounded-xl bg-white/80 px-4 py-2.5">
          <StarRating value={stars} size={22} />
          <span className="leading-tight">
            <b className="block font-display text-lg text-ink">{score}%</b>
            <span className="text-xs text-muted">{starLabel(stars)}</span>
          </span>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat value={result.wpm} label="so'z/daqiqa" good={result.wpm >= target.wpm} />
        <Stat value={`${result.accuracy}%`} label="aniqlik" good={result.accuracy >= target.accuracy} />
        <Stat value={result.errors} label="xato belgi" />
        <Stat value={`${Math.round(result.durationMs / 1000)}s`} label="vaqt" />
      </div>

      {certificate && (
        <Link
          href={`/certificates/${certificate.id}`}
          className="mt-5 flex items-center gap-3 rounded-xl border border-indigo-200 bg-white p-4 hover:border-primary"
        >
          <Award size={22} className="shrink-0 text-primary" />
          <span className="text-sm">
            <b className="block text-ink">Tabriklaymiz — kurs yakunlandi!</b>
            <span className="text-muted">Sertifikatingiz tayyor: {certificate.serial}</span>
          </span>
        </Link>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" onClick={onRetry} className="btn-outline">
          <RotateCcw size={16} /> Qayta urinish
        </button>
        {passed && hasNext && (
          <button type="button" onClick={onNext} className="btn-primary">
            Keyingi dars <ArrowRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
