// Davr (period) bo'yicha hisobot yordamchilari — dashboard va maosh hisobotlari
// uchun umumiy. Sof funksiyalar (prisma'siz).
//
// Yig'indilar bazada hisoblanadi (`utils/reportSql.js`), bu yerdagi funksiyalar
// esa faqat bazadan kelgan kun/oy kalitlari ustida ishlaydi: bo'sh oraliqlarni
// nol bilan to'ldiradi. Kalitlar Toshkent vaqti (UTC+5) bo'yicha — bazadagi
// guruhlash bilan bir xil bo'lishi shart.

// Toshkent (UTC+5, yozgi vaqt yo'q). Kalitlarni shu surilma bilan hisoblaymiz,
// shunda server qaysi mintaqada turishidan qat'i nazar natija bir xil bo'ladi.
const TZ_OFFSET_HOURS = 5;
const TZ_OFFSET_MS = TZ_OFFSET_HOURS * 60 * 60 * 1000;

// Hozirgi vaqt Toshkent mintaqasida — kalitlar UTC getter'lari bilan o'qiladi
function tzNow() {
  return new Date(Date.now() + TZ_OFFSET_MS);
}

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

// Grafik qanday kesimda chiziladi: qisqa davrlarda kunlik, uzunlarida oylik.
function granularityFor(days) {
  return days === null || days > 90 ? 'month' : 'day';
}

// Oxirgi N kun uchun uzluksiz qator (bo'sh kunlar 0 bilan to'ldiriladi).
// map — bazadan kelgan { '2026-08-16': 1200, ... }
function fillDays(map, days) {
  const now = tzNow();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const out = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const key = new Date(today - i * 86400000).toISOString().slice(0, 10);
    out.push({ key, value: map[key] || 0 });
  }
  return out;
}

// Oxirgi N oy uchun uzluksiz qator. map — { '2026-08': 1200, ... }
function fillMonths(map, months = 12) {
  const now = tzNow();
  const out = [];
  for (let i = months - 1; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const key = d.toISOString().slice(0, 7);
    out.push({ key, value: map[key] || 0 });
  }
  return out;
}

// Eng eski yozuvdan bugungacha bo'lgan barcha oylar ("butun davr" uchun).
// Yozuv bo'lmasa — oxirgi 12 oy nol bilan.
function fillAllMonths(map) {
  const keys = Object.keys(map).sort();
  if (keys.length === 0) return fillMonths(map, 12);
  const [year, month] = keys[0].split('-').map(Number);
  const now = tzNow();
  const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
  const out = [];
  let cursor = Date.UTC(year, month - 1, 1);
  while (cursor <= end) {
    const d = new Date(cursor);
    const key = d.toISOString().slice(0, 7);
    out.push({ key, value: map[key] || 0 });
    cursor = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
  }
  return out;
}

// Tanlangan davrga mos qator: qisqa davrlarda kunlik, uzunlarida oylik.
// dayMap — kunlik kalitlar, monthMap — oylik kalitlar (bazadan).
// Qaytaradi: { granularity: 'day'|'month', points: [{ key, value }] }
function seriesFor(days, { dayMap = {}, monthMap = {} } = {}) {
  if (days === null) return { granularity: 'month', points: fillAllMonths(monthMap) };
  if (days <= 90) return { granularity: 'day', points: fillDays(dayMap, days) };
  return { granularity: 'month', points: fillMonths(monthMap, 12) };
}

module.exports = {
  PERIOD_DAYS, PERIODS, periodRange, growthPct,
  TZ_OFFSET_HOURS, TZ_OFFSET_MS, tzNow,
  granularityFor, fillDays, fillMonths, fillAllMonths, seriesFor,
};
