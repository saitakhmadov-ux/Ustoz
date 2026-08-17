'use client';

// Academic Task 1 vizuali.
//
// LINE / BAR / PIE / TABLE — maʼlumot `chartData` da saqlanadi va shu yerda
// SVG bilan chiziladi: yangi kutubxona kerak emas, ranglar saytning oʻziniki
// va har qanday ekranda tiniq chiqadi. Eng muhimi — maʼlumot matn sifatida
// ham mavjud, shuning uchun AI baholovchi talabaning sonlar haqidagi
// daʼvolarini tekshira oladi.
//
// PROCESS / MAP — sxema va xarita: bularni sondan chizib boʻlmaydi, admin
// panel orqali rasm yuklanadi. Rasm hali yuklanmagan boʻlsa, topshiriq
// ishlashda davom etadi: tavsif matn koʻrinishida koʻrsatiladi.

import { fileUrl } from '@/lib/constants';
import { CHART_COLORS, niceMax } from '@/lib/ielts';

const W = 660;
const H = 320;
const PAD = { top: 20, right: 20, bottom: 46, left: 52 };
const PLOT = { w: W - PAD.left - PAD.right, h: H - PAD.top - PAD.bottom };

function Legend({ series }) {
  if (series.length < 2) return null;
  return (
    <div className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm">
      {series.map((s, i) => (
        <span key={s.name} className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
          <span className="text-muted">{s.name}</span>
        </span>
      ))}
    </div>
  );
}

// Y oʻqi chiziqlari va belgilari (line va bar uchun umumiy)
function Grid({ max, unit }) {
  const steps = [0, 0.25, 0.5, 0.75, 1];
  return (
    <g>
      {steps.map((t) => {
        const y = PAD.top + PLOT.h * (1 - t);
        return (
          <g key={t}>
            <line x1={PAD.left} y1={y} x2={PAD.left + PLOT.w} y2={y} stroke="#e2e8f0" strokeWidth="1" />
            <text x={PAD.left - 8} y={y + 4} textAnchor="end" className="fill-slate-500" fontSize="11">
              {Math.round(max * t * 10) / 10}
            </text>
          </g>
        );
      })}
      {unit && (
        <text x={PAD.left - 8} y={PAD.top - 6} textAnchor="end" className="fill-slate-400" fontSize="10">
          {unit}
        </text>
      )}
    </g>
  );
}

function XLabels({ labels }) {
  const step = PLOT.w / labels.length;
  // Yorliq koʻp boʻlsa bittasini tashlab ketamiz — ustma-ust tushmasin
  const skip = labels.length > 8 ? Math.ceil(labels.length / 8) : 1;
  return (
    <g>
      {labels.map((l, i) => (i % skip === 0 ? (
        <text
          key={l + i}
          x={PAD.left + step * i + step / 2}
          y={H - PAD.bottom + 18}
          textAnchor="middle"
          className="fill-slate-600"
          fontSize="11"
        >
          {l}
        </text>
      ) : null))}
    </g>
  );
}

function LineChart({ data }) {
  const max = niceMax(Math.max(...data.series.flatMap((s) => s.values)));
  const step = PLOT.w / data.labels.length;
  const x = (i) => PAD.left + step * i + step / 2;
  const y = (v) => PAD.top + PLOT.h * (1 - v / max);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img">
      <Grid max={max} unit={data.unit} />
      <XLabels labels={data.labels} />
      {data.series.map((s, si) => {
        const color = CHART_COLORS[si % CHART_COLORS.length];
        const points = s.values.map((v, i) => `${x(i)},${y(v)}`).join(' ');
        return (
          <g key={s.name}>
            <polyline points={points} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" />
            {s.values.map((v, i) => (
              <circle key={i} cx={x(i)} cy={y(v)} r="3.5" fill="white" stroke={color} strokeWidth="2" />
            ))}
          </g>
        );
      })}
    </svg>
  );
}

function BarChart({ data }) {
  const max = niceMax(Math.max(...data.series.flatMap((s) => s.values)));
  const group = PLOT.w / data.labels.length;
  const barW = Math.min(28, (group * 0.7) / data.series.length);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img">
      <Grid max={max} unit={data.unit} />
      <XLabels labels={data.labels} />
      {data.labels.map((_, i) => (
        <g key={i}>
          {data.series.map((s, si) => {
            const v = s.values[i] ?? 0;
            const h = PLOT.h * (v / max);
            const gx = PAD.left + group * i + group / 2;
            const offset = (si - (data.series.length - 1) / 2) * (barW + 3);
            return (
              <rect
                key={s.name}
                x={gx + offset - barW / 2}
                y={PAD.top + PLOT.h - h}
                width={barW}
                height={h}
                rx="3"
                fill={CHART_COLORS[si % CHART_COLORS.length]}
              />
            );
          })}
        </g>
      ))}
    </svg>
  );
}

// Bitta doiraviy diagramma (har bir seriya uchun alohida chiziladi)
function Pie({ labels, values, title }) {
  const total = values.reduce((a, b) => a + b, 0) || 1;
  const R = 78;
  const cx = 100;
  const cy = 100;
  let angle = -Math.PI / 2; // yuqoridan boshlanadi

  const slices = values.map((v, i) => {
    const a = (v / total) * Math.PI * 2;
    const x1 = cx + R * Math.cos(angle);
    const y1 = cy + R * Math.sin(angle);
    angle += a;
    const x2 = cx + R * Math.cos(angle);
    const y2 = cy + R * Math.sin(angle);
    const large = a > Math.PI ? 1 : 0;
    return {
      d: `M ${cx} ${cy} L ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} Z`,
      color: CHART_COLORS[i % CHART_COLORS.length],
      label: labels[i],
      percent: Math.round((v / total) * 100),
    };
  });

  return (
    <figure className="min-w-[180px] flex-1">
      <svg viewBox="0 0 200 200" className="h-auto w-full max-w-[220px]" role="img">
        {slices.map((s) => <path key={s.label} d={s.d} fill={s.color} stroke="white" strokeWidth="1.5" />)}
      </svg>
      {title && <figcaption className="mt-1 text-center text-sm font-medium text-ink">{title}</figcaption>}
    </figure>
  );
}

function PieChart({ data }) {
  return (
    <div>
      <div className="flex flex-wrap items-start justify-center gap-6">
        {data.series.map((s) => (
          <Pie key={s.name} labels={data.labels} values={s.values} title={data.series.length > 1 ? s.name : null} />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm">
        {data.labels.map((l, i) => (
          <span key={l} className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
            <span className="text-muted">{l}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function TableChart({ data }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-line bg-slate-50 text-left text-xs uppercase text-muted">
          <tr>
            <th className="px-4 py-2.5"> </th>
            {data.series.map((s) => <th key={s.name} className="px-4 py-2.5">{s.name}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {data.labels.map((l, i) => (
            <tr key={l}>
              <td className="px-4 py-2.5 font-medium text-ink">{l}</td>
              {data.series.map((s) => (
                <td key={s.name} className="px-4 py-2.5 text-muted">
                  {s.values[i]}{data.unit ? ` ${data.unit}` : ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ChartView({ task }) {
  const { visual, chartData, imageUrl, dataSummary } = task || {};
  if (!visual || visual === 'NONE') return null;

  // Sxema va xarita — rasm
  if (visual === 'PROCESS' || visual === 'MAP') {
    if (imageUrl) {
      return (
        <figure className="rounded-xl border border-line bg-surface p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={fileUrl(imageUrl)} alt={dataSummary || 'IELTS diagramma'} className="mx-auto max-h-[420px] w-auto" />
        </figure>
      );
    }
    // Rasm hali yuklanmagan — topshiriq baribir ishlaydi
    return (
      <div className="rounded-xl border border-dashed border-line bg-slate-50 p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          {visual === 'MAP' ? 'Map description' : 'Process description'}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-ink">{dataSummary}</p>
      </div>
    );
  }

  if (!chartData?.labels?.length || !chartData?.series?.length) return null;

  const body = visual === 'LINE' ? <LineChart data={chartData} />
    : visual === 'BAR' ? <BarChart data={chartData} />
      : visual === 'PIE' ? <PieChart data={chartData} />
        : <TableChart data={chartData} />;

  return (
    <figure className="rounded-xl border border-line bg-surface p-4">
      {body}
      {visual !== 'PIE' && visual !== 'TABLE' && <Legend series={chartData.series} />}
      {chartData.caption && (
        <figcaption className="mt-2 text-center text-sm text-muted">{chartData.caption}</figcaption>
      )}
    </figure>
  );
}
