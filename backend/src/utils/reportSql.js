// Hisobotlar uchun BAZADA bajariladigan sana kesimidagi guruhlash.
//
// Nega xom SQL: Prisma `groupBy` yozuvlarni kun yoki oy kesimida guruhlay
// olmaydi — faqat ustun qiymati bo'yicha. Grafik uchun yozuvlarni Node
// xotirasiga to'liq tortib olish esa sotuvlar soni o'sganda sekinlik va
// xotira muammosiga olib keladi. Shu sababli kun/oy guruhlashi bazaga
// topshiriladi va Node'ga faqat tayyor yig'indilar keladi.
//
// Vaqt mintaqasi: kun va oy kalitlari HAR DOIM Toshkent vaqti (UTC+5)
// bo'yicha hisoblanadi — server qaysi mintaqada turishidan qat'i nazar
// natija bir xil bo'ladi. Xuddi shu kelishuv `jobs/dailyProgress.js` da ham
// ishlatiladi (O'zbekistonda yozgi vaqt yo'q, shuning uchun surilma o'zgarmas).
const { Prisma } = require('@prisma/client');
const prisma = require('../config/prisma');
const { TZ_OFFSET_HOURS } = require('./period');

// Toshkent vaqti bo'yicha yil ('YYYY'), oy ('YYYY-MM') yoki kun ('YYYY-MM-DD') kaliti
const KEY_FORMATS = { year: 'YYYY', month: 'YYYY-MM', day: 'YYYY-MM-DD' };

function keyExpr(unit, column = 'createdAt') {
  const format = KEY_FORMATS[unit] || KEY_FORMATS.day;
  return Prisma.raw(
    `to_char("${column}" + INTERVAL '${TZ_OFFSET_HOURS} hours', '${format}')`
  );
}

// Sana kesimida guruhlangan yig'indilar.
//
//   table   — jadval nomi ('Earning', 'Payment', ...)
//   metrics — { nom: 'SQL ifoda' }, masalan { sales: 'COUNT(*)', gross: 'SUM("grossAmount")' }
//   where   — Prisma.sql shart (parametrlar bilan)
//   unit    — 'day' | 'month'
//
// DIQQAT: `table` va `metrics` faqat shu fayldagi/controllerlardagi doimiy
// qiymatlar bo'lishi kerak — ularga foydalanuvchi kiritgan matn tushmasin
// (Prisma.raw parametrlashtirmaydi). Foydalanuvchi qiymatlari `where` ichida,
// Prisma.sql parametri sifatida uzatiladi.
async function dateBuckets({ table, metrics, where, unit, column = 'createdAt' }) {
  const columns = Prisma.raw(
    Object.entries(metrics).map(([name, expr]) => `${expr} AS "${name}"`).join(', ')
  );
  const rows = await prisma.$queryRaw`
    SELECT ${keyExpr(unit, column)} AS "key", ${columns}
    FROM ${Prisma.raw(`"${table}"`)}
    WHERE ${where}
    GROUP BY 1
    ORDER BY 1
  `;
  // SUM/COUNT Postgres'da bigint qaytaradi — JSON uchun oddiy songa o'tkazamiz
  return rows.map((r) => {
    const out = { key: r.key };
    for (const name of Object.keys(metrics)) out[name] = Number(r[name] || 0);
    return out;
  });
}

// Guruhlangan qatorlardan { kalit: qiymat } xaritasi
function toMap(rows, field = 'value') {
  const map = {};
  for (const r of rows) map[r.key] = r[field];
  return map;
}

module.exports = { dateBuckets, toMap };
