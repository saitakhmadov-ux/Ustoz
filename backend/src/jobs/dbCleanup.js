// Bazani tozalash — vaqtinchalik va eskirgan yozuvlarni o'chiradi.
//
// Nega kerak: quyidagi jadvallar hech qachon kamaymaydi va vaqt o'tishi bilan
// bazani to'ldiradi. Ular biznes ma'lumoti emas — ishlatilgan bir martalik
// tokenlar, eskirgan xabarlar va analitika tarixi.
//
// O'CHIRILMAYDI: to'lovlar (Payment), daromadlar (Earning), o'tkazmalar (Payout),
// sertifikatlar (Certificate), yozilishlar (Enrollment), progress (TaskProgress /
// LessonProgress), sharhlar (Review). Bular hisobot va huquqiy ma'lumot.
//
// Muddatlarni shu yerdan o'zgartirasiz.
const prisma = require('../config/prisma');

// ---- Saqlash muddatlari ----
const CODE_GRACE_DAYS = 1; // muddati o'tgan tasdiqlash kodlari shuncha kundan keyin
const LINK_KEEP_DAYS = 7; // ishlatilgan/eskirgan Telegram ulash havolalari
const NOTIF_KEEP_DAYS = 180; // O'QILGAN bildirishnomalar (o'qilmaganlar qolaveradi)
const AI_USAGE_KEEP_DAYS = 365; // AI so'rovlari tarixi (admin analitikasi shundan o'qiydi)

const INTERVAL_MS = 24 * 60 * 60 * 1000; // kuniga bir marta
const FIRST_RUN_DELAY_MS = 5 * 60 * 1000; // server ko'tarilgach 5 daqiqadan keyin

let timer = null;

const daysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

// Bir marta tozalab chiqadi. Qaytaradi: har bir jadval bo'yicha o'chirilganlar soni.
async function runOnce() {
  const now = new Date();

  // 1) Muddati o'tgan tasdiqlash kodlari (email tasdiqlash / parol tiklash).
  //    Ishlatilganlari ham keraksiz — kod bir marta amal qiladi.
  const codes = await prisma.verificationCode.deleteMany({
    where: { expiresAt: { lt: daysAgo(CODE_GRACE_DAYS) } },
  });

  // 2) Telegram ulash havolalari: ishlatilgani yoki muddati o'tgani.
  const links = await prisma.telegramLink.deleteMany({
    where: {
      OR: [
        { usedAt: { lt: daysAgo(LINK_KEEP_DAYS) } },
        { expiresAt: { lt: daysAgo(LINK_KEEP_DAYS) } },
      ],
    },
  });

  // 3) O'qilgan eski bildirishnomalar. O'qilmaganlar hech qachon o'chirilmaydi —
  //    foydalanuvchi ko'rmagan xabar yo'qolib qolmasin.
  const notifications = await prisma.notification.deleteMany({
    where: { read: true, createdAt: { lt: daysAgo(NOTIF_KEEP_DAYS) } },
  });

  // 4) AI so'rovlari tarixi — eng tez o'sadigan jadval (har savol = bitta qator,
  //    savol matni bilan). Analitika oxirgi davrlar bo'yicha ishlaydi.
  const aiUsage = await prisma.aiUsage.deleteMany({
    where: { createdAt: { lt: daysAgo(AI_USAGE_KEEP_DAYS) } },
  });

  const result = {
    verificationCodes: codes.count,
    telegramLinks: links.count,
    notifications: notifications.count,
    aiUsage: aiUsage.count,
  };

  const total = Object.values(result).reduce((a, b) => a + b, 0);
  if (total > 0) {
    console.log('🧹 Baza tozalandi:', JSON.stringify(result), `(${now.toISOString()})`);
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
  CODE_GRACE_DAYS,
  LINK_KEEP_DAYS,
  NOTIF_KEEP_DAYS,
  AI_USAGE_KEEP_DAYS,
};
