'use client';

// Maosh hisobotlari uchun umumiy UI bo'laklari — ustoz va bosh admin
// panellari ikkalasi ham shu komponentlardan foydalanadi.
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatMoney } from '@/lib/constants';

// "2026-08" -> "Avg 2026"
const MONTHS = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];

export function monthLabel(key, withYear = true) {
  const [y, m] = String(key).split('-');
  const name = MONTHS[Number(m) - 1] || m;
  return withYear ? `${name} ${y}` : name;
}

// Katta summani qisqartirilgan ko'rinishda: 1 250 000 -> "1.25 mln"
export function shortMoney(value) {
  const n = Number(value) || 0;
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)} mln`;
  if (Math.abs(n) >= 1_000) return `${Math.round(n / 1000)} ming`;
  return String(n);
}

// O'sish ko'rsatkichi — musbat yashil, manfiy qizil, nol kulrang
export function GrowthBadge({ value, suffix = 'oldingi davrga nisbatan' }) {
  if (value === null || value === undefined) return null;
  const up = value > 0;
  const flat = value === 0;
  const Icon = flat ? Minus : up ? TrendingUp : TrendingDown;
  const cls = flat ? 'text-muted' : up ? 'text-emerald-600' : 'text-red-600';
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${cls}`}>
      <Icon size={13} />
      {up ? '+' : ''}{value}%
      {suffix && <span className="font-normal text-muted">· {suffix}</span>}
    </span>
  );
}

// Ko'rsatkich kartasi
export function StatCard({ label, value, hint, icon: Icon, color = 'bg-indigo-50 text-indigo-600', growth, money = true }) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        {Icon && (
          <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${color}`}>
            <Icon size={20} />
          </span>
        )}
      </div>
      <div className="mt-3 font-display text-2xl font-bold tabular-nums">
        {money ? formatMoney(value) : value}
      </div>
      <div className="text-sm text-muted">{label}</div>
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
      {growth !== undefined && growth !== null && (
        <div className="mt-2"><GrowthBadge value={growth} suffix="" /></div>
      )}
    </div>
  );
}

// "2026-08-10" -> "08-10" (o'q yorlig'i uchun qisqa ko'rinish)
function dayLabel(key) {
  return String(key).slice(5);
}

// Vaqt bo'yicha ustunli grafik (kutubxonasiz).
// data: [{ key, value }] — key kunlik ('2026-08-10') yoki oylik ('2026-08').
// granularity backenddan keladi va tanlangan davrga bog'liq.
export function TimeBars({
  data,
  granularity = 'month',
  color = 'var(--color-primary)',
  label = 'daromad',
  caption,
}) {
  if (!data || data.length === 0) {
    return <p className="py-10 text-center text-sm text-muted">Ma'lumot yo'q</p>;
  }
  const daily = granularity === 'day';
  const max = Math.max(...data.map((d) => d.value), 1);
  const empty = data.every((d) => d.value === 0);
  // Nuqta ko'p bo'lsa yorliqlar bir-birining ustiga chiqmasligi uchun siyraklashtiramiz
  const labelStep = Math.ceil(data.length / 12);
  const gap = daily && data.length > 40 ? 'gap-0.5' : 'gap-1.5';
  const minWidth = daily && data.length > 40 ? 3 : 6;

  // Qator bir nechta yilni qamrasa oy nomi yolg'iz o'zi chalkash bo'ladi
  // (Mar, Iyn, ... Mar) — shuning uchun yilning oxirgi ikki raqami qo'shiladi
  const multiYear = !daily && new Set(data.map((d) => String(d.key).slice(0, 4))).size > 1;
  const axisLabel = (k) => (daily
    ? dayLabel(k)
    : monthLabel(k, false) + (multiYear ? ` ${String(k).slice(2, 4)}` : ''));
  const tipLabel = (k) => (daily ? k : monthLabel(k));

  return (
    <div className="mt-4">
      {empty && (
        <p className="mb-2 text-xs text-muted">Bu davrda daromad qayd etilmagan</p>
      )}
      <div className={`flex h-44 items-end ${gap}`}>
        {data.map((d) => (
          // h-full muhim: ustun balandligi foizda berilgan, shuning uchun ota
          // element aniq balandlikka ega bo'lishi shart (items-end cho'zmaydi)
          <div key={d.key} className="group relative flex h-full flex-1 flex-col justify-end" style={{ minWidth }}>
            <div
              className="rounded-t transition-opacity hover:opacity-80"
              style={{ height: `${Math.max(2, (d.value / max) * 100)}%`, background: color }}
            />
            <span className="pointer-events-none absolute -top-8 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-ink px-2 py-1 text-xs text-white group-hover:block">
              {tipLabel(d.key)}: {formatMoney(d.value)}
            </span>
          </div>
        ))}
      </div>
      <div className={`mt-2 flex text-[10px] text-muted ${gap}`}>
        {/* Yorliqlar siyraklashtirilgani uchun matn qo'shni bo'sh katakka
            chiqib turishi mumkin — truncate emas, nowrap kerak */}
        {data.map((d, i) => (
          <span key={d.key} className="flex-1 whitespace-nowrap text-center" style={{ minWidth }}>
            {i % labelStep === 0 ? axisLabel(d.key) : ''}
          </span>
        ))}
      </div>
      {caption && <p className="mt-2 text-center text-xs text-muted">{caption} · {label}</p>}
    </div>
  );
}

// Ikki qismli nisbat chizig'i (masalan organik / promo kod)
export function SplitBar({ parts }) {
  const total = parts.reduce((s, p) => s + (p.value || 0), 0);
  return (
    <div>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-slate-100">
        {total > 0 && parts.map((p) => (
          <div
            key={p.label}
            className={p.cls}
            style={{ width: `${(p.value / total) * 100}%` }}
            title={`${p.label}: ${formatMoney(p.value)}`}
          />
        ))}
      </div>
      <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1.5 text-xs">
        {parts.map((p) => (
          <span key={p.label} className="inline-flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-full ${p.cls}`} />
            <span className="text-muted">{p.label}</span>
            <b className="tabular-nums">{formatMoney(p.value)}</b>
            {total > 0 && (
              <span className="text-muted">({Math.round((p.value / total) * 100)}%)</span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

// To'lov taqsimotini ko'rsatuvchi "shaffof hisob" bloki —
// o'quvchi to'lagan summa qanday bo'lingani bosqichma-bosqich.
export function SplitBreakdown({ gross, tax, taxPct, instructor, platform, sharePct }) {
  const rows = [
    { label: "O'quvchilar to'lagani", value: gross, cls: 'font-semibold' },
    { label: `Soliq (${taxPct}%)`, value: -tax, cls: 'text-red-600' },
    { label: 'Sof foyda', value: gross - tax, cls: 'border-t border-line pt-2 font-semibold' },
    { label: `Sizning ulushingiz${sharePct ? ` (${sharePct}%)` : ''}`, value: instructor, cls: 'text-emerald-700 font-semibold' },
    { label: 'Tizim ulushi', value: platform, cls: 'text-muted' },
  ];
  return (
    <dl className="space-y-2 text-sm">
      {rows.map((r) => (
        <div key={r.label} className={`flex items-baseline justify-between gap-4 ${r.cls}`}>
          <dt>{r.label}</dt>
          <dd className="tabular-nums">
            {r.value < 0 ? `− ${formatMoney(Math.abs(r.value))}` : formatMoney(r.value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

// Davr tanlash tugmalari
export const PERIODS = [
  { key: '7d', label: '7 kun' },
  { key: '30d', label: '30 kun' },
  { key: '90d', label: '90 kun' },
  { key: '1y', label: '1 yil' },
  { key: 'all', label: 'Butun davr' },
];

// Grafik ostidagi izoh — tanlangan davr nimani qamrab olganini aytadi
export const PERIOD_CAPTION = {
  '7d': 'Oxirgi 7 kun',
  '30d': 'Oxirgi 30 kun',
  '90d': 'Oxirgi 90 kun',
  '1y': 'Oxirgi 12 oy',
  all: 'Butun davr',
};

export function PeriodTabs({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {PERIODS.map((p) => (
        <button
          key={p.key}
          type="button"
          onClick={() => onChange(p.key)}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors
            ${value === p.key ? 'bg-primary text-white' : 'bg-slate-100 text-muted hover:bg-slate-200'}`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
