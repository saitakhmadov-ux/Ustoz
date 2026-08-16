// Baza boshqaruvi — faqat bosh admin uchun (admin.routes'da `adminOnly`).
//
// Uchta vazifa:
//   1) Baza qanchalik to'lganini ko'rsatish (jadval kesimida hajm va qatorlar).
//   2) Tozalash muddatlarini boshqarish va tozalashni qo'lda ishga tushirish
//      (avval "quruq" ko'rish — nima o'chishini ko'rsatadi).
//   3) Zaxira yuklab olish (JSON yoki pg_dump).
//
// Bu yerda TIKLASH (restore) yo'q — tasodifan bosib butun bazani yo'qotish
// xavfi juda katta. Tiklash terminal orqali: `npm run db:restore -- <fayl>`
// yoki SQL zaxira uchun `pg_restore` (README ga qarang).
const { Prisma } = require('@prisma/client');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const prisma = require('../config/prisma');
const {
  getSetting, setSetting, normalizeRetention, getRetentionConfig,
  DB_RETENTION_KEY, RETENTION_DEFAULTS,
} = require('../utils/settings');
const { runOnce, LAST_RUN_KEY } = require('../jobs/dbCleanup');
const { streamJsonBackup, streamPgDump, pgDumpInfo } = require('../utils/backup');

// Baytni o'qiladigan ko'rinishga (1.4 MB)
function humanSize(bytes) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = Number(bytes) || 0;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${value < 10 && i > 0 ? value.toFixed(1) : Math.round(value)} ${units[i]}`;
}

// GET /api/admin/db/stats — baza holati
const stats = asyncHandler(async (req, res) => {
  // Jadvallar ro'yxati va hajmi katalogdan. Hajm — indekslar bilan birga.
  const tables = await prisma.$queryRaw`
    SELECT c.relname AS name, pg_total_relation_size(c.oid)::bigint AS bytes
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
    ORDER BY pg_total_relation_size(c.oid) DESC
  `;

  // Qator sonlari ANIQ sanaladi. `pg_stat_user_tables.n_live_tup` tezroq,
  // lekin u ANALYZE oralig'ida eskirib qoladi va panelda noto'g'ri son
  // ko'rsatadi. Barcha jadvallar bitta so'rovda sanaladi (UNION ALL) —
  // jadval nomlari katalogdan kelgani uchun bu yerda xavf yo'q.
  const countQuery = tables.length
    ? Prisma.join(
      tables.map((t) => Prisma.sql`SELECT ${t.name} AS name, COUNT(*)::bigint AS rows FROM ${Prisma.raw(`"${t.name}"`)}`),
      ' UNION ALL '
    )
    : null;
  const counts = countQuery ? await prisma.$queryRaw`${countQuery}` : [];
  const rowsByName = new Map(counts.map((c) => [c.name, Number(c.rows)]));

  const rows = tables.map((t) => ({ name: t.name, bytes: t.bytes, rows: rowsByName.get(t.name) || 0 }));

  const sizeRows = await prisma.$queryRaw`
    SELECT pg_database_size(current_database())::bigint AS bytes
  `;

  const [retention, lastCleanup, pgDump] = await Promise.all([
    getRetentionConfig(),
    getSetting(LAST_RUN_KEY, null),
    pgDumpInfo(),
  ]);

  const totalBytes = Number(sizeRows[0] ? sizeRows[0].bytes : 0);
  res.json({
    success: true,
    db: {
      bytes: totalBytes,
      size: humanSize(totalBytes),
      tables: rows.map((r) => ({
        name: r.name,
        rows: Number(r.rows),
        bytes: Number(r.bytes),
        size: humanSize(r.bytes),
      })),
    },
    retention,
    defaults: RETENTION_DEFAULTS,
    lastCleanup,
    pgDump: { available: pgDump.available, version: pgDump.version },
  });
});

// PUT /api/admin/db/retention — tozalash muddatlarini saqlash
const updateRetention = asyncHandler(async (req, res) => {
  const retention = normalizeRetention(req.body);
  await setSetting(DB_RETENTION_KEY, retention);
  res.json({
    success: true,
    message: 'Tozalash muddatlari saqlandi',
    retention,
  });
});

// POST /api/admin/db/cleanup?dryRun=1 — tozalashni ishga tushirish
// dryRun bo'lsa hech narsa o'chirilmaydi, faqat nechta qator tegishi qaytadi.
const cleanup = asyncHandler(async (req, res) => {
  const dryRun = req.query.dryRun === '1' || req.query.dryRun === 'true';
  const result = await runOnce({ dryRun });
  res.json({
    success: true,
    message: dryRun
      ? `${result.total} ta yozuv o'chirilishi mumkin`
      : `${result.total} ta yozuv o'chirildi`,
    result,
  });
});

// GET /api/admin/db/backup?format=json|sql — zaxirani yuklab olish
const backup = asyncHandler(async (req, res) => {
  const format = req.query.format === 'sql' ? 'sql' : 'json';

  if (format === 'sql') {
    const info = await pgDumpInfo();
    if (!info.available) {
      throw ApiError.badRequest(
        'Bu serverda `pg_dump` topilmadi, shuning uchun SQL zaxira olinmaydi. '
        + 'JSON zaxirani yuklab oling — u hech qanday qo\'shimcha dastur talab '
        + `qilmaydi. (Tafsilot: ${info.error || 'nomaʼlum'})`
      );
    }
  }

  try {
    if (format === 'sql') await streamPgDump(res);
    else await streamJsonBackup(res);
  } catch (err) {
    // Sarlavhalar ketib bo'lgan bo'lsa oddiy JSON xato yubora olmaymiz —
    // ulanishni uzamiz, brauzer yuklab olishni muvaffaqiyatsiz deb ko'rsatadi
    if (res.headersSent) {
      res.destroy();
      return;
    }
    throw err;
  }
});

module.exports = { stats, updateRetention, cleanup, backup };
