// Kurs progressi — halqa koʻrsatkich.
//
// Foiz chizigʻidan farqi: halqa "qancha qoldi" ni bir qarashda koʻrsatadi va
// markazda qolgan darslar soni turadi — oʻquvchi uchun foizdan koʻra shu
// tushunarliroq ("3 ta dars qoldi" > "72%").

const SIZE = 96;
const STROKE = 8;
const R = (SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;

export default function ProgressRing({ percent = 0, done = 0, total = 0 }) {
  const p = Math.max(0, Math.min(100, percent));
  const left = Math.max(0, total - done);
  const complete = p >= 100;

  return (
    <div className="flex items-center gap-4">
      <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} className="-rotate-90" aria-hidden="true">
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            strokeWidth={STROKE}
            className="text-slate-100"
            stroke="currentColor"
          />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            strokeWidth={STROKE}
            strokeLinecap="round"
            stroke="currentColor"
            className={complete ? 'text-accent' : 'text-primary'}
            style={{
              strokeDasharray: C,
              strokeDashoffset: C * (1 - p / 100),
              transition: 'stroke-dashoffset 700ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <span className="font-display text-xl font-bold leading-none text-heading">{p}%</span>
        </div>
      </div>

      <div className="min-w-0">
        {complete ? (
          <p className="font-display text-base font-bold leading-tight text-accent">
            Kurs tugallandi
          </p>
        ) : (
          <>
            <p className="font-display text-2xl font-bold leading-none text-heading">
              {left}
            </p>
            <p className="text-sm leading-snug text-muted">
              {left === 1 ? 'ta dars qoldi' : 'ta dars qoldi'}
            </p>
          </>
        )}
        <p className="mt-1 text-xs text-subtle">{done}/{total} dars bajarildi</p>
      </div>
    </div>
  );
}
