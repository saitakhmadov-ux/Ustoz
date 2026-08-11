// Davr (period) bo'yicha hisobot yordamchilari — dashboard va maosh hisobotlari
// uchun umumiy. Sof funksiyalar (prisma'siz).

// Davr parametrini kunlarga aylantirish. 'all' -> null (butun davr).
const PERIOD_DAYS = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 };
const PERIODS = ['7d', '30d', '90d', '1y', 'all'];

// So'rov parametridan davr chegaralarini hisoblaydi.
// Qaytaradi: { period, days, from, prevFrom } — from null bo'lsa cheklov yo'q.
function periodRange(value, fallback = '30d') {
  // Aniq ro'yxat — prototip zanjiriga tushib qolmaslik uchun
  const period = PERIODS.includes(value) ? value : fallback;
  const days = period === 'all' ? null : PERIOD_DAYS[period];
  const now = new Date();
  return {
    period,
    days,
    from: days === null ? null : new Date(now.getTime() - days * 86400000),
    prevFrom: days === null ? null : new Date(now.getTime() - 2 * days * 86400000),
  };
}

// O'sish foizi: oldingi davrga nisbatan. Oldingi 0 bo'lsa — yangi o'sish 100%.
function growthPct(current, previous) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

// Sanalar bo'yicha guruhlash (kunlik yoki oylik) — grafik uchun.
// days null yoki 90 dan katta bo'lsa oylik guruhlanadi.
function bucketByDate(rows, days, valueFn = () => 1) {
  const monthly = days === null || days > 90;
  const map = {};
  for (const r of rows) {
    const d = new Date(r.createdAt);
    const key = monthly
      ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      : d.toISOString().slice(0, 10);
    map[key] = (map[key] || 0) + valueFn(r);
  }
  return Object.entries(map)
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// Oxirgi N oy uchun uzluksiz qator (bo'sh oylar 0 bilan to'ldiriladi).
// rows — { createdAt } bo'lgan yozuvlar; valueFn — har yozuvdan olinadigan qiymat.
// Qaytaradi: [{ month: '2026-08', value }] — eskidan yangiga.
function monthlySeries(rows, months = 12, valueFn = () => 1) {
  const map = {};
  for (const r of rows) {
    const d = new Date(r.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    map[key] = (map[key] || 0) + valueFn(r);
  }
  const out = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    out.push({ month: key, value: map[key] || 0 });
  }
  return out;
}

// Sana kalitlari — mahalliy vaqt bo'yicha (monthlySeries bilan bir xil mantiq,
// UTC'ga o'tib ketmaslik uchun)
const pad = (n) => String(n).padStart(2, '0');
const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const monthKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;

// Oxirgi N kun uchun uzluksiz qator (bo'sh kunlar 0 bilan to'ldiriladi).
function dailySeries(rows, days, valueFn = () => 1) {
  const map = {};
  for (const r of rows) {
    const k = dayKey(new Date(r.createdAt));
    map[k] = (map[k] || 0) + valueFn(r);
  }
  const out = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const k = dayKey(d);
    out.push({ key: k, value: map[k] || 0 });
  }
  return out;
}

// Eng eski yozuvdan bugungacha bo'lgan barcha oylar ("butun davr" uchun).
function allMonthsSeries(rows, valueFn = () => 1) {
  if (rows.length === 0) {
    return monthlySeries(rows, 12, valueFn).map((m) => ({ key: m.month, value: m.value }));
  }
  const map = {};
  let earliest = null;
  for (const r of rows) {
    const d = new Date(r.createdAt);
    const k = monthKey(d);
    map[k] = (map[k] || 0) + valueFn(r);
    if (!earliest || d < earliest) earliest = d;
  }
  const out = [];
  const now = new Date();
  const cursor = new Date(earliest.getFullYear(), earliest.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 1);
  while (cursor <= end) {
    const k = monthKey(cursor);
    out.push({ key: k, value: map[k] || 0 });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return out;
}

// Tanlangan davrga mos qator: qisqa davrlarda kunlik, uzunlarida oylik.
// Qaytaradi: { granularity: 'day'|'month', points: [{ key, value }] }
function timeSeries(rows, days, valueFn = () => 1) {
  if (days === null) return { granularity: 'month', points: allMonthsSeries(rows, valueFn) };
  if (days <= 90) return { granularity: 'day', points: dailySeries(rows, days, valueFn) };
  return {
    granularity: 'month',
    points: monthlySeries(rows, 12, valueFn).map((m) => ({ key: m.month, value: m.value })),
  };
}

module.exports = {
  PERIOD_DAYS, PERIODS, periodRange, growthPct, bucketByDate, monthlySeries,
  dailySeries, allMonthsSeries, timeSeries,
};
