// Ustoz uchun Telegram buyruqlari: /maosh va /oquvchilarim.
//
// Xavfsizlik: buyruqlar faqat INSTRUCTOR va ADMIN rollariga ochiq. Ustoz faqat
// O'ZIGA biriktirilgan kurslar kesimini ko'radi (`instructorId` filtri), bosh
// admin esa butun platforma kesimini. O'quvchilarning shaxsiy ma'lumotlari
// (email, telefon, to'lov tafsiloti) bu yerda ko'rsatilmaydi — faqat sonlar.
const prisma = require('../config/prisma');
const {
  esc, bar, money, growth, siteUrl,
} = require('./format');
const {
  accessInfo, accessMonthsFor, buildTaskIndex, progressFor, deriveStatus,
} = require('../utils/learnProgress');

const TEACHER_ROLES = ['INSTRUCTOR', 'ADMIN'];
const isTeacher = (user) => TEACHER_ROLES.includes(user.role);
const NOT_TEACHER = 'Bu buyruq ustozlar uchun. Sizda ustoz huquqi yo\'q.';

// Ustoz — faqat o'zi; bosh admin — hammasi
const ownScope = (user) => (user.role === 'INSTRUCTOR' ? { instructorId: user.id } : {});

// Oy boshi
const monthStart = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), 1);

const MONTHS = [
  'yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun',
  'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr',
];

// Davr bo'yicha yig'indi — hisob-kitob BAZADA bajariladi.
// Yozuvlarni Node xotirasiga tortib olmaymiz: sotuvlar soni yillar davomida
// o'sadi va butun jadvalni o'qish sekinlik/xotira muammosiga olib keladi.
async function sumEarnings(where) {
  const agg = await prisma.earning.aggregate({
    where,
    _count: { _all: true },
    _sum: { grossAmount: true, instructorAmount: true, platformAmount: true },
  });
  return {
    sales: agg._count._all || 0,
    gross: agg._sum.grossAmount || 0,
    instructor: agg._sum.instructorAmount || 0,
    platform: agg._sum.platformAmount || 0,
  };
}

// ---------- /maosh ----------
async function maoshText(user) {
  const scope = ownScope(user);
  const admin = user.role === 'ADMIN';
  const amountField = admin ? 'platformAmount' : 'instructorAmount';

  const mStart = monthStart();
  const prevStart = new Date(mStart.getFullYear(), mStart.getMonth() - 1, 1);

  const [total, thisMonth, lastMonth, payouts, grouped] = await Promise.all([
    sumEarnings(scope),
    sumEarnings({ ...scope, createdAt: { gte: mStart } }),
    sumEarnings({ ...scope, createdAt: { gte: prevStart, lt: mStart } }),
    prisma.payout.aggregate({ where: { ...scope, status: 'PAID' }, _sum: { amount: true } }),
    // Kurs kesimi — faqat eng yuqori 5 tasi bazadan olinadi
    prisma.earning.groupBy({
      by: ['courseId'],
      where: scope,
      _count: { _all: true },
      _sum: { instructorAmount: true, platformAmount: true },
      orderBy: { _sum: { [amountField]: 'desc' } },
      take: 5,
    }),
  ]);

  if (!total.sales) {
    return [
      `<b>${admin ? 'Platforma daromadi' : 'Maoshim'}</b> 💰`,
      '',
      'Hali sotuv bo\'lmagan — daromad yozuvlari yo\'q.',
      '',
      `Batafsil: ${siteUrl()}/admin/earnings`,
    ].join('\n');
  }

  // "Meniki" — ustoz uchun o'z ulushi, admin uchun platforma ulushi
  const mine = (s) => (admin ? s.platform : s.instructor);
  const growthPct = (() => {
    const prev = mine(lastMonth);
    const cur = mine(thisMonth);
    if (prev === 0) return cur > 0 ? 100 : 0;
    return Math.round(((cur - prev) / prev) * 100);
  })();

  // Kurs nomlarini faqat top 5 uchun olamiz
  const courses = await prisma.course.findMany({
    where: { id: { in: grouped.map((g) => g.courseId) } },
    select: { id: true, title: true },
  });
  const titleById = new Map(courses.map((c) => [c.id, c.title]));
  const top = grouped.map((g) => ({
    title: titleById.get(g.courseId) || '—',
    amount: g._sum[amountField] || 0,
    sales: g._count._all || 0,
  }));

  const paid = payouts._sum.amount || 0;
  const earned = mine(total);

  const lines = [
    `<b>${admin ? 'Platforma daromadi' : 'Maoshim'}</b> 💰`,
    '',
    `<b>${MONTHS[mStart.getMonth()]} oyi</b>`,
    `Ulush: ${money(mine(thisMonth))} so'm  ${growth(growthPct)}`,
    `Sotuv: ${thisMonth.sales} ta · aylanma ${money(thisMonth.gross)} so'm`,
    '',
    '<b>Jami</b>',
    `Ishlangan: ${money(earned)} so'm (${total.sales} sotuv)`,
  ];

  if (admin) {
    lines.push(`Ustozlar ulushi: ${money(total.instructor)} so'm`);
    lines.push(`Ustozlarga to'langan: ${money(paid)} so'm`);
  } else {
    lines.push(`To'langan: ${money(paid)} so'm`);
    lines.push(`Qoldiq: ${money(earned - paid)} so'm`);
  }

  if (top.length) {
    lines.push('', '<b>Kurslar bo\'yicha</b>');
    top.forEach((c, i) => {
      lines.push(`${i + 1}. ${esc(c.title)} — ${money(c.amount)} so'm (${c.sales} sotuv)`);
    });
  }

  lines.push('', `Batafsil: ${siteUrl()}/admin/earnings`);
  return lines.join('\n');
}

// ---------- /oquvchilarim ----------
async function studentsText(user) {
  const courses = await prisma.course.findMany({
    where: user.role === 'INSTRUCTOR' ? { instructorId: user.id } : {},
    select: {
      id: true, title: true, level: true, accessMonths: true,
    },
  });

  if (!courses.length) {
    return [
      '<b>O\'quvchilarim</b> 👥',
      '',
      'Sizga hali kurs biriktirilmagan.',
      '',
      `Panel: ${siteUrl()}/admin/students`,
    ].join('\n');
  }

  const ids = courses.map((c) => c.id);
  const courseById = new Map(courses.map((c) => [c.id, c]));

  // teaching.controller.listStudents bilan bir xil yondashuv: yozilishlar
  // to'liq o'qiladi va hisob-kitob xotirada bajariladi.
  const [enrollments, lessons, taskRows, certificates] = await Promise.all([
    prisma.enrollment.findMany({
      where: { courseId: { in: ids } },
      select: {
        userId: true, courseId: true, createdAt: true, expiresAt: true,
      },
    }),
    prisma.lesson.findMany({
      where: { section: { courseId: { in: ids } } },
      select: {
        id: true,
        videoUrl: true,
        content: true,
        materials: { select: { id: true, type: true } },
        questions: { select: { id: true } },
        section: { select: { courseId: true } },
      },
    }),
    prisma.taskProgress.findMany({
      where: { lesson: { section: { courseId: { in: ids } } } },
      select: { userId: true, taskKey: true, lessonId: true },
    }),
    prisma.certificate.findMany({
      where: { courseId: { in: ids } },
      select: { userId: true, courseId: true },
    }),
  ]);

  if (!enrollments.length) {
    return [
      '<b>O\'quvchilarim</b> 👥',
      '',
      `Kurslaringiz: ${courses.length} ta. Hali birorta o'quvchi yozilmagan.`,
      '',
      `Panel: ${siteUrl()}/admin/students`,
    ].join('\n');
  }

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
  const certSet = new Set(certificates.map((c) => `${c.userId}:${c.courseId}`));

  const summary = {
    completed: 0, inProgress: 0, notStarted: 0, expired: 0,
  };
  const perCourse = new Map(ids.map((id) => [id, { count: 0, percentSum: 0 }]));
  const uniqueUsers = new Set();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  let newThisWeek = 0;

  for (const e of enrollments) {
    const key = `${e.userId}:${e.courseId}`;
    const course = courseById.get(e.courseId);
    const progress = progressFor(taskIndex.get(e.courseId), doneBy.get(key) || new Set());
    const access = accessInfo(e.expiresAt, course ? accessMonthsFor(course) : null);
    const status = deriveStatus({
      hasCertificate: certSet.has(key),
      expired: access.expired,
      completedTasks: progress.completedTasks,
    });

    summary[status] += 1;
    uniqueUsers.add(e.userId);
    if (e.createdAt >= weekAgo) newThisWeek += 1;

    const row = perCourse.get(e.courseId);
    if (row) {
      row.count += 1;
      row.percentSum += progress.percent;
    }
  }

  const lines = [
    '<b>O\'quvchilarim</b> 👥',
    '',
    `Jami: ${enrollments.length} yozilish · ${uniqueUsers.size} o'quvchi`,
    `✅ Tugatgan: ${summary.completed}   🔄 Jarayonda: ${summary.inProgress}`,
    `💤 Boshlamagan: ${summary.notStarted}   ⛔ Muddati tugagan: ${summary.expired}`,
    `Oxirgi 7 kunda: ${newThisWeek > 0 ? `+${newThisWeek}` : '0'} yangi yozilish`,
    '',
    '<b>Kurslar bo\'yicha</b>',
  ];

  const ranked = courses
    .map((c) => ({ course: c, ...perCourse.get(c.id) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  for (const r of ranked) {
    const avg = r.count ? Math.round(r.percentSum / r.count) : 0;
    lines.push(
      `📘 <b>${esc(r.course.title)}</b>`,
      `   ${r.count} o'quvchi · ${bar(avg)}`,
    );
  }
  if (courses.length > ranked.length) {
    lines.push(`… va yana ${courses.length - ranked.length} ta kurs`);
  }

  lines.push('', `Batafsil: ${siteUrl()}/admin/students`);
  return lines.join('\n');
}

// Buyruq tanalari — "/maosh" ham, tugma bosilishi ham shu yerga keladi.
// extra — qo'shimcha reply parametrlari (masalan tugmalar paneli).
async function maoshCommand(ctx, user, extra = {}) {
  if (!isTeacher(user)) return ctx.reply(NOT_TEACHER, extra);
  return ctx.reply(await maoshText(user), { parse_mode: 'HTML', ...extra });
}

async function studentsCommand(ctx, user, extra = {}) {
  if (!isTeacher(user)) return ctx.reply(NOT_TEACHER, extra);
  return ctx.reply(await studentsText(user), { parse_mode: 'HTML', ...extra });
}

// Buyruqlarni botga ulaydi. findUser — handlers.js dagi umumiy yordamchi
// (ulanmagan foydalanuvchiga o'zi yo'l ko'rsatadi va null qaytaradi).
function registerTeacherCommands(bot, findUser) {
  bot.command('maosh', async (ctx) => {
    const user = await findUser(ctx);
    if (!user) return undefined;
    return maoshCommand(ctx, user);
  });

  bot.command('oquvchilarim', async (ctx) => {
    const user = await findUser(ctx);
    if (!user) return undefined;
    return studentsCommand(ctx, user);
  });
}

module.exports = {
  registerTeacherCommands, isTeacher, maoshCommand, studentsCommand,
};
