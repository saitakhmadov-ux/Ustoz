// "Kursga yangi dars qo'shildi" xabari.
//
// Nega dars yaratilishi bilan darrov yubormaymiz:
//   - ustoz darsni bo'sh yaratib, keyin video/matn/testlarni to'ldiradi;
//     xabar darhol ketsa, o'quvchi bo'sh darsga kelib qoladi
//   - bir o'tirishda 10 ta dars qo'shilsa, 10 ta xabar spam bo'ladi
//
// Shuning uchun: dars yaratilgandan DELAY_MIN o'tgach, bitta kurs bo'yicha
// barcha yangi darslar BITTA xabarga jamlanadi. Har bir dars uchun xabar
// faqat bir marta ketadi — `Lesson.announcedAt` shuni belgilaydi.
//
// Xabar faqat e'lon qilingan (published) kurslarga va kirish muddati
// tugamagan o'quvchilarga boradi. Telegram yuborish navbat orqali ketadi.
const prisma = require('../config/prisma');
const { notifyMany } = require('../utils/notify');

const DELAY_MIN = 30; // dars yaratilgach shuncha daqiqa kutamiz
const MAX_AGE_DAYS = 7; // bundan eski darslar haqida endi xabar bermaymiz
const INTERVAL_MS = 60 * 60 * 1000; // soatiga bir marta
const FIRST_RUN_DELAY_MS = 60 * 1000;
const MAX_TITLES = 5; // xabarda nechta dars nomi ko'rsatiladi

let timer = null;

// Xabar matni: bitta dars bo'lsa nomi, ko'p bo'lsa ro'yxat
function messageFor(course, lessons) {
  const titles = lessons.slice(0, MAX_TITLES).map((l) => `• ${l.title}`);
  const qolgan = lessons.length - titles.length;
  if (qolgan > 0) titles.push(`• ...va yana ${qolgan} ta dars`);

  return {
    title: lessons.length === 1 ? 'Yangi dars qo\'shildi' : `Yangi darslar (${lessons.length} ta)`,
    body: `"${course.title}" kursida yangi material bor:\n\n${titles.join('\n')}`,
    url: `/learn/${course.slug}`,
  };
}

// Bir marta tekshirib chiqadi. Qaytaradi: xabar berilgan kurslar soni.
async function runOnce() {
  const now = Date.now();

  const lessons = await prisma.lesson.findMany({
    where: {
      announcedAt: null,
      createdAt: {
        lte: new Date(now - DELAY_MIN * 60 * 1000),
        gte: new Date(now - MAX_AGE_DAYS * 24 * 60 * 60 * 1000),
      },
      section: { course: { published: true } },
    },
    select: {
      id: true,
      title: true,
      section: { select: { course: { select: { id: true, title: true, slug: true } } } },
    },
    orderBy: { createdAt: 'asc' },
    take: 200,
  });
  if (!lessons.length) return 0;

  // Kurs bo'yicha guruhlaymiz — o'quvchi bitta xabar oladi
  const byCourse = new Map();
  for (const lesson of lessons) {
    const course = lesson.section.course;
    if (!byCourse.has(course.id)) byCourse.set(course.id, { course, items: [] });
    byCourse.get(course.id).items.push(lesson);
  }

  let announced = 0;
  for (const { course, items } of byCourse.values()) {
    /* eslint-disable no-await-in-loop */
    const enrollments = await prisma.enrollment.findMany({
      where: {
        courseId: course.id,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: { userId: true },
    });

    if (enrollments.length) {
      await notifyMany(enrollments.map((e) => e.userId), {
        event: 'lesson',
        ...messageFor(course, items),
      });
      announced += 1;
    }

    // O'quvchisi bo'lmasa ham belgilaymiz — keyin qayta ko'rilmasin
    await prisma.lesson.updateMany({
      where: { id: { in: items.map((l) => l.id) } },
      data: { announcedAt: new Date() },
    });
    /* eslint-enable no-await-in-loop */
  }

  if (announced > 0) {
    console.log(`📗 Yangi dars xabari: ${announced} ta kurs bo'yicha yuborildi`);
  }
  return announced;
}

function startNewLessonsJob() {
  if (timer) return;
  const tick = () => runOnce().catch((err) => {
    console.error('Yangi dars xabarida xatolik:', err.message);
  });

  setTimeout(tick, FIRST_RUN_DELAY_MS);
  timer = setInterval(tick, INTERVAL_MS);
  if (typeof timer.unref === 'function') timer.unref();
}

function stopNewLessonsJob() {
  if (timer) clearInterval(timer);
  timer = null;
}

module.exports = {
  startNewLessonsJob, stopNewLessonsJob, runOnce, DELAY_MIN,
};
