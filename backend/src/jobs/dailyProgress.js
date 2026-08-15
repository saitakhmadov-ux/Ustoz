// Kunlik progress eslatmasi (Telegram).
//
// Kimga: hisobini botga ulagan, kursga yozilgan, lekin uni HALI TUGATMAGAN
// (sertifikat olmagan) va kirish muddati tugamagan foydalanuvchiga.
// Sertifikat olingach o'sha kurs ro'yxatdan chiqadi; barcha kurslari tugagan
// odamga umuman xabar yuborilmaydi.
//
// Qancha: kuniga bir marta va bitta xabar (kurslar soni qancha bo'lsa ham) —
// `User.progressPingAt` shuni ta'minlaydi. Foydalanuvchi /kunlik bilan
// o'chirib qo'ysa (`progressPingOff`), boshqa yuborilmaydi.
//
// Vaqti: O'zbekiston bo'yicha ertalab soat 10 dan keyingi birinchi tekshiruvda.
// Server o'sha payt o'chiq bo'lsa, kun davomida ko'tarilganda yuboriladi
// (kuniga bittadan oshmaydi).
const prisma = require('../config/prisma');
const { sendMessage } = require('../telegram/bot');
const {
  accessInfo, accessMonthsFor, buildTaskIndex, progressFor,
} = require('../utils/learnProgress');
const {
  esc, bar, siteUrl, siteIsLinkable,
} = require('../telegram/format');

const TZ_OFFSET_HOURS = 5; // Asia/Tashkent (UTC+5, yozgi vaqt yo'q)
const SEND_HOUR = 10; // mahalliy vaqt bilan shu soatdan keyin
const MIN_GAP_MS = 20 * 60 * 60 * 1000; // oxirgi eslatmadan keyingi eng kam tanaffus
const INTERVAL_MS = 60 * 60 * 1000; // har soatda tekshiramiz
const FIRST_RUN_DELAY_MS = 60 * 1000; // server ko'tarilishiga xalaqit bermaslik uchun
const USER_BATCH = 300; // bir yurishda nechta foydalanuvchi
const MAX_COURSES_IN_MESSAGE = 6;

let timer = null;

// Mahalliy (Toshkent) soat
function localHour(now = new Date()) {
  return (now.getUTCHours() + TZ_OFFSET_HOURS) % 24;
}

// Bitta foydalanuvchi uchun xabar matni. Yuboradigan narsa bo'lmasa null.
function buildMessage(rows) {
  if (!rows.length) return null;

  const lines = ['📊 <b>Bugungi holat</b>', ''];
  for (const r of rows.slice(0, MAX_COURSES_IN_MESSAGE)) {
    let muddat;
    if (r.daysLeft === null) muddat = 'muddatsiz';
    else if (r.daysLeft <= 3) muddat = `⚠️ ${r.daysLeft} kun qoldi`;
    else muddat = `${r.daysLeft} kun qoldi`;

    lines.push(`📘 <b>${esc(r.title)}</b>`, `${bar(r.percent)} · ${muddat}`);

    const url = `${siteUrl()}/learn/${r.slug}`;
    if (siteIsLinkable()) lines.push(`<a href="${url}">▶️ Davom ettirish</a>`);
    lines.push('');
  }

  if (rows.length > MAX_COURSES_IN_MESSAGE) {
    lines.push(`… va yana ${rows.length - MAX_COURSES_IN_MESSAGE} ta kurs`, '');
  }

  lines.push(
    '<i>Kursni to\'liq yakunlasangiz sertifikat avtomatik beriladi.</i>',
    '<i>Kunlik eslatmani o\'chirish: /kunlik</i>',
  );
  return lines.join('\n');
}

// Bir marta tekshirib chiqadi. Qaytaradi: yuborilgan xabarlar soni.
async function runOnce({ force = false } = {}) {
  const now = new Date();
  if (!force && localHour(now) < SEND_HOUR) return 0;

  const due = new Date(now.getTime() - MIN_GAP_MS);
  const users = await prisma.user.findMany({
    where: {
      telegramChatId: { not: null },
      progressPingOff: false,
      OR: [{ progressPingAt: null }, { progressPingAt: { lt: due } }],
    },
    select: { id: true, telegramChatId: true },
    take: USER_BATCH,
  });
  if (!users.length) return 0;

  const userIds = users.map((u) => u.id);

  // Yozilishlar: muddati tugamaganlari (muddatsizlar ham)
  const enrollments = await prisma.enrollment.findMany({
    where: { userId: { in: userIds } },
    select: {
      userId: true,
      courseId: true,
      expiresAt: true,
      course: {
        select: {
          title: true, slug: true, level: true, accessMonths: true,
        },
      },
    },
  });

  // Sertifikat olingan (userId:courseId) juftliklari — ular ro'yxatdan chiqadi
  const certificates = await prisma.certificate.findMany({
    where: { userId: { in: userIds } },
    select: { userId: true, courseId: true },
  });
  const certSet = new Set(certificates.map((c) => `${c.userId}:${c.courseId}`));

  // Faqat tugatilmagan va muddati o'tmagan yozilishlar qoladi
  const active = enrollments.filter((e) => {
    if (certSet.has(`${e.userId}:${e.courseId}`)) return false;
    return !accessInfo(e.expiresAt, accessMonthsFor(e.course)).expired;
  });

  // Yuboradigan narsasi bo'lmaganlar ham "bugun ko'rildi" deb belgilanadi —
  // har soatda qayta hisoblanmasin.
  const haveWork = new Set(active.map((e) => e.userId));

  let sent = 0;
  if (active.length) {
    const courseIds = [...new Set(active.map((e) => e.courseId))];
    const activeUserIds = [...haveWork];

    const [lessons, taskRows] = await Promise.all([
      prisma.lesson.findMany({
        where: { section: { courseId: { in: courseIds } } },
        select: {
          id: true,
          videoUrl: true,
          content: true,
          materials: { select: { id: true, type: true } },
          questions: { select: { id: true } },
          typingDrill: { select: { id: true } },
          section: { select: { courseId: true } },
        },
      }),
      prisma.taskProgress.findMany({
        where: {
          userId: { in: activeUserIds },
          lesson: { section: { courseId: { in: courseIds } } },
        },
        select: { userId: true, taskKey: true, lessonId: true },
      }),
    ]);

    const taskIndex = buildTaskIndex(lessons);
    const lessonCourse = new Map(lessons.map((l) => [l.id, l.section.courseId]));
    const doneBy = new Map(); // "userId:courseId" -> Set(taskKey)
    for (const r of taskRows) {
      const courseId = lessonCourse.get(r.lessonId);
      if (!courseId) continue;
      const key = `${r.userId}:${courseId}`;
      if (!doneBy.has(key)) doneBy.set(key, new Set());
      doneBy.get(key).add(r.taskKey);
    }

    // Foydalanuvchi kesimida yig'amiz
    const byUser = new Map();
    for (const e of active) {
      const key = `${e.userId}:${e.courseId}`;
      const progress = progressFor(taskIndex.get(e.courseId), doneBy.get(key) || new Set());
      // 100% bo'lsa-yu sertifikat hali berilmagan bo'lsa — bu o'tkinchi holat,
      // eslatma o'rinsiz bo'ladi (sertifikat darsni yakunlashda beriladi).
      if (progress.percent >= 100) continue;

      const { daysLeft } = accessInfo(e.expiresAt, accessMonthsFor(e.course));
      if (!byUser.has(e.userId)) byUser.set(e.userId, []);
      byUser.get(e.userId).push({
        title: e.course.title,
        slug: e.course.slug,
        percent: progress.percent,
        daysLeft,
      });
    }

    for (const u of users) {
      const rows = (byUser.get(u.id) || []).sort((a, b) => {
        // Muddati yaqinlari birinchi, keyin progressi yuqorilari
        const aDays = a.daysLeft === null ? Infinity : a.daysLeft;
        const bDays = b.daysLeft === null ? Infinity : b.daysLeft;
        if (aDays !== bDays) return aDays - bDays;
        return b.percent - a.percent;
      });
      const text = buildMessage(rows);
      if (!text) continue;

      // eslint-disable-next-line no-await-in-loop
      const res = await sendMessage(u.telegramChatId, text, {
        link_preview_options: { is_disabled: true },
      });
      if (res.sent) sent += 1;
      else if (/blocked|chat not found|deactivated/i.test(res.error || '')) {
        // Bot bloklangan — bog'lanishni tozalaymiz, keyingi safar urinmaymiz
        // eslint-disable-next-line no-await-in-loop
        await prisma.user.update({
          where: { id: u.id },
          data: { telegramChatId: null, telegramUsername: null, telegramLinkedAt: null },
        });
      }
    }
  }

  await prisma.user.updateMany({
    where: { id: { in: userIds } },
    data: { progressPingAt: now },
  });

  if (sent > 0) console.log(`📊 Kunlik progress eslatmasi: ${sent} ta yuborildi`);
  return sent;
}

// Vaqti-vaqti bilan ishga tushiradi. Xatolik butun serverni to'xtatmaydi.
function startDailyProgressJob() {
  if (timer) return;
  const tick = () => runOnce().catch((err) => {
    console.error('Kunlik progress vazifasida xatolik:', err.message);
  });

  setTimeout(tick, FIRST_RUN_DELAY_MS);
  timer = setInterval(tick, INTERVAL_MS);
  if (typeof timer.unref === 'function') timer.unref();
}

function stopDailyProgressJob() {
  if (timer) clearInterval(timer);
  timer = null;
}

module.exports = {
  startDailyProgressJob,
  stopDailyProgressJob,
  runOnce,
  buildMessage,
  localHour, // sinov uchun ham ochiq
  SEND_HOUR,
};
