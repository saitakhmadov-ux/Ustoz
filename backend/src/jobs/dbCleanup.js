// Bazani tozalash — vaqtinchalik, eskirgan va haddan ortiq to'planib qolgan
// yozuvlarni o'chiradi.
//
// Nega kerak: quyidagi jadvallar hech qachon kamaymaydi va vaqt o'tishi bilan
// bazani to'ldiradi. Ular biznes ma'lumoti emas — ishlatilgan bir martalik
// tokenlar, eskirgan xabarlar, mashq urinishlari va analitika tarixi.
//
// O'CHIRILMAYDI: to'lovlar (Payment), daromadlar (Earning), o'tkazmalar (Payout),
// sertifikatlar (Certificate), yozilishlar (Enrollment), progress (TaskProgress /
// LessonProgress), sharhlar (Review). Bular hisobot va huquqiy ma'lumot.
//
// Urinishlar (TypingAttempt / QuizAttempt / IeltsAttempt) o'chsa ham o'quvchining
// progressi va sertifikati buzilmaydi — ular alohida jadvalda saqlanadi.
//
// Muddatlar admin panelidan boshqariladi (`utils/settings.js` — `db_retention`).
const { Prisma } = require('@prisma/client');
const prisma = require('../config/prisma');
const { getRetentionConfig, setSetting } = require('../utils/settings');

const INTERVAL_MS = 24 * 60 * 60 * 1000; // kuniga bir marta
const FIRST_RUN_DELAY_MS = 5 * 60 * 1000; // server ko'tarilgach 5 daqiqadan keyin
const BATCH = 5000; // bir DELETE da shuncha qator — uzoq lock bo'lmasligi uchun
const LAST_RUN_KEY = 'db_cleanup_last'; // oxirgi natija (panel ko'rsatadi)

let timer = null;

const daysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

// Berilgan filtr bo'yicha o'chiradi (dryRun bo'lsa faqat sanaydi).
async function remove(model, where, dryRun) {
  if (dryRun) return prisma[model].count({ where });
  const res = await prisma[model].deleteMany({ where });
  return res.count;
}

// Oddiy qoida: "shuncha kundan eski". days=0 bo'lsa qoida o'chirilgan.
function trimByAge(model, where, days, dryRun) {
  if (!days) return 0;
  return remove(model, { ...where, createdAt: { lt: daysAgo(days) } }, dryRun);
}

// Urinishlar jadvallari uchun qoida: "eski" YOKI "chegaradan ortiq".
//
// Har (o'quvchi × dars) juftligida oxirgi `keep` ta urinish yoshidan qat'i
// nazar qoladi — o'quvchi o'z oxirgi natijalarini doim ko'radi. Qolganlari
// `days` kundan oshsa yoki chegaradan ortiq bo'lsa o'chadi.
//
// Prisma bunday shartni ifodalay olmaydi (oyna funksiyasi kerak), shuning
// uchun xom SQL. Jadval va ustun nomlari shu fayldagi doimiy qiymatlar —
// foydalanuvchi kiritgan matn emas.
async function trimAttempts({ table, partitionBy, days, keep, dryRun }) {
  const conditions = [];
  if (keep > 0) conditions.push(Prisma.sql`t.rn > ${keep}`);
  if (days > 0) conditions.push(Prisma.sql`t."createdAt" < ${daysAgo(days)}`);
  if (conditions.length === 0) return 0; // ikkala qoida ham o'chirilgan

  const tableSql = Prisma.raw(`"${table}"`);
  const partition = Prisma.raw(partitionBy.map((c) => `"${c}"`).join(', '));
  const predicate = Prisma.join(conditions, ' OR ');

  // Nomzod qatorlar: har juftlik ichida yangidan eskiga raqamlanadi
  const ranked = Prisma.sql`
    SELECT id, "createdAt",
           ROW_NUMBER() OVER (PARTITION BY ${partition} ORDER BY "createdAt" DESC) AS rn
    FROM ${tableSql}
  `;

  if (dryRun) {
    const rows = await prisma.$queryRaw`
      SELECT COUNT(*)::int AS n FROM (${ranked}) t WHERE ${predicate}
    `;
    return rows[0] ? rows[0].n : 0;
  }

  let total = 0;
  for (;;) {
    const removed = await prisma.$executeRaw`
      DELETE FROM ${tableSql} WHERE id IN (
        SELECT t.id FROM (${ranked}) t WHERE ${predicate} LIMIT ${BATCH}
      )
    `;
    total += removed;
    if (removed < BATCH) return total;
  }
}

// Bir marta tozalab chiqadi.
// dryRun: true — hech narsa o'chirilmaydi, faqat nechta qator tegishini qaytaradi.
// Qaytaradi: { dryRun, at, total, tables: { jadval: son } }
async function runOnce({ dryRun = false } = {}) {
  const cfg = await getRetentionConfig();

  // 1) Muddati o'tgan tasdiqlash kodlari (email tasdiqlash / parol tiklash).
  //    Ishlatilganlari ham keraksiz — kod bir marta amal qiladi. Bu yerda
  //    `createdAt` emas, `expiresAt` bo'yicha tekshiriladi.
  const codeCutoff = daysAgo(cfg.verificationCodeDays);
  // 2) Telegram ulash havolalari: ishlatilgani yoki muddati o'tgani.
  const linkCutoff = daysAgo(cfg.telegramLinkDays);

  const tables = {
    verificationCodes: cfg.verificationCodeDays
      ? await remove('verificationCode', { expiresAt: { lt: codeCutoff } }, dryRun)
      : 0,

    telegramLinks: cfg.telegramLinkDays
      ? await remove('telegramLink', {
        OR: [{ usedAt: { lt: linkCutoff } }, { expiresAt: { lt: linkCutoff } }],
      }, dryRun)
      : 0,

    // 3) O'qilgan eski bildirishnomalar.
    notificationsRead: await trimByAge(
      'notification', { read: true }, cfg.notificationReadDays, dryRun
    ),

    // 4) O'qilmagan, lekin juda eski bildirishnomalar. Ilgari bular umuman
    //    o'chirilmasdi — foydalanuvchi hech qachon ochmasa jadval o'sib borardi.
    notificationsUnread: await trimByAge(
      'notification', { read: false }, cfg.notificationUnreadDays, dryRun
    ),

    // 5) AI so'rovlari tarixi (analitika oxirgi davrlar bo'yicha ishlaydi).
    aiUsage: await trimByAge('aiUsage', {}, cfg.aiUsageDays, dryRun),

    // 6) Klaviatura mashqi urinishlari — erkin mashq rejimi tufayli eng tez
    //    o'sadigan jadval (lessonId null bo'lsa hammasi bitta juftlikda).
    typingAttempts: await trimAttempts({
      table: 'TypingAttempt',
      partitionBy: ['userId', 'lessonId'],
      days: cfg.typingAttemptDays,
      keep: cfg.typingAttemptKeep,
      dryRun,
    }),

    // 7) Test urinishlari.
    quizAttempts: await trimAttempts({
      table: 'QuizAttempt',
      partitionBy: ['userId', 'lessonId'],
      days: cfg.quizAttemptDays,
      keep: cfg.quizAttemptKeep,
      dryRun,
    }),

    // 8) IELTS insholari — qatorlari eng og'iri (insho matni + AI izohi).
    ieltsAttempts: await trimAttempts({
      table: 'IeltsAttempt',
      partitionBy: ['userId', 'taskId'],
      days: cfg.ieltsAttemptDays,
      keep: cfg.ieltsAttemptKeep,
      dryRun,
    }),
  };

  const total = Object.values(tables).reduce((a, b) => a + b, 0);
  const result = { dryRun, at: new Date().toISOString(), total, tables };

  if (!dryRun) {
    if (total > 0) console.log('🧹 Baza tozalandi:', JSON.stringify(tables), `(${result.at})`);
    // Panel oxirgi tozalash natijasini ko'rsatadi (server qayta ishga
    // tushsa ham yo'qolmasin)
    await setSetting(LAST_RUN_KEY, result).catch(() => {});
  }
  return result;
}

function startDbCleanupJob() {
  if (timer) return;
  const tick = () => runOnce().catch((err) => {
    console.error('Baza tozalash vazifasida xatolik:', err.message);
  });

  setTimeout(tick, FIRST_RUN_DELAY_MS);
  timer = setInterval(tick, INTERVAL_MS);
  if (typeof timer.unref === 'function') timer.unref();
}

function stopDbCleanupJob() {
  if (timer) clearInterval(timer);
  timer = null;
}

module.exports = {
  startDbCleanupJob,
  stopDbCleanupJob,
  runOnce,
  LAST_RUN_KEY,
};
