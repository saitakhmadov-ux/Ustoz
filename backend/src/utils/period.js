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

module.exports = { PERIOD_DAYS, PERIODS, periodRange, growthPct, bucketByDate, monthlySeries };
