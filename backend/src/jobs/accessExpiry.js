// Kirish muddati tugayotgan yozilishlar uchun ogohlantirish.
//
// Kuniga ikki marta tekshiriladi (server uzoq ishlaydi, alohida cron kerak emas).
// Har bir yozilish uchun ogohlantirish FAQAT BIR MARTA yuboriladi —
// `Enrollment.expiryWarnedAt` shuni belgilaydi va muddat yangilanganda
// null ga qaytariladi (qarang: enroll / payment / admin extend).
const prisma = require('../config/prisma');
const { notifyAccessExpiring } = require('../utils/notify');
const { accessInfo } = require('../utils/learnProgress');

const WARN_DAYS = 3; // necha kun oldin ogohlantiramiz
const INTERVAL_MS = 12 * 60 * 60 * 1000; // 12 soat
const FIRST_RUN_DELAY_MS = 30 * 1000; // server ko'tarilishiga xalaqit bermaslik uchun

let timer = null;

// Bir marta tekshirib chiqadi. Qaytaradi: yuborilgan ogohlantirishlar soni.
async function runOnce() {
  const now = new Date();
  const until = new Date(now.getTime() + WARN_DAYS * 24 * 60 * 60 * 1000);

  const rows = await prisma.enrollment.findMany({
    where: {
      expiryWarnedAt: null,
      expiresAt: { gt: now, lte: until },
    },
    include: { course: { select: { title: true, slug: true } } },
    take: 500, // bir yurishda mo''tadil hajm
  });

  let sent = 0;
  for (const e of rows) {
    const { daysLeft } = accessInfo(e.expiresAt);
    await notifyAccessExpiring(e.userId, e.course, daysLeft || 1);
    await prisma.enrollment.update({
      where: { id: e.id },
      data: { expiryWarnedAt: new Date() },
    });
    sent += 1;
  }

  if (sent > 0) console.log(`⏰ Muddat ogohlantirishi: ${sent} ta yuborildi`);
  return sent;
}

// Vaqti-vaqti bilan ishga tushiradi. Xatolik butun serverni to'xtatmaydi.
function startAccessExpiryJob() {
  if (timer) return;
  const tick = () => runOnce().catch((err) => {
    console.error('Muddat ogohlantirish vazifasida xatolik:', err.message);
  });

  setTimeout(tick, FIRST_RUN_DELAY_MS);
  timer = setInterval(tick, INTERVAL_MS);
  // Vazifa server o'chishini ushlab turmasin
  if (typeof timer.unref === 'function') timer.unref();
}

function stopAccessExpiryJob() {
  if (timer) clearInterval(timer);
  timer = null;
}

module.exports = { startAccessExpiryJob, stopAccessExpiryJob, runOnce, WARN_DAYS };
