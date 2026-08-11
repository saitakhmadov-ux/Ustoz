// Admin controlleri — statistika, foydalanuvchilar va ustoz adminlar
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { computeProgress } = require('./enrollment.controller');
const { computeExpiry, accessInfo, accessMonthsFor } = require('../utils/learnProgress');
const { periodRange, growthPct, bucketByDate } = require('../utils/period');

// Davr yordamchilari maosh hisoboti bilan umumiy — utils/period.js da.

// GET /api/admin/stats — umumiy statistika
// ?period=7d|30d|90d|1y|all (standart 30d) — davr bo'yicha o'sish va grafik bilan
const stats = asyncHandler(async (req, res) => {
  // Davr va uning chegaralari (joriy + taqqoslash uchun oldingi davr)
  const { period, days, from, prevFrom } = periodRange(req.query.period);

  const [users, courses, publishedCourses, enrollments, paidPayments, recentPayments] =
    await Promise.all([
      prisma.user.count({ where: { role: 'USER' } }),
      prisma.course.count(),
      prisma.course.count({ where: { published: true } }),
      prisma.enrollment.count(),
      prisma.payment.aggregate({
        where: { status: 'PAID' },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.payment.findMany({
        where: { status: 'PAID' },
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: {
          user: { select: { fullName: true, email: true } },
          course: { select: { title: true } },
        },
      }),
    ]);

  // Eng ko'p sotilgan kurslar
  const topCourses = await prisma.course.findMany({
    take: 5,
    orderBy: { enrollments: { _count: 'desc' } },
    select: {
      id: true, title: true, price: true, isFree: true,
      _count: { select: { enrollments: true } },
    },
  });

  // ---- Davr bo'yicha dinamika (joriy vs oldingi) ----
  // Grafik uchun joriy davrdagi xom yozuvlar
  const periodWhere = from ? { createdAt: { gte: from } } : {};
  const prevWhere = from ? { createdAt: { gte: prevFrom, lt: from } } : null;

  const [curUsers, curEnroll, curPayments] = await Promise.all([
    prisma.user.findMany({
      where: { role: 'USER', ...periodWhere },
      select: { createdAt: true },
    }),
    prisma.enrollment.findMany({ where: periodWhere, select: { createdAt: true } }),
    prisma.payment.findMany({
      where: { status: 'PAID', ...periodWhere },
      select: { createdAt: true, amount: true },
    }),
  ]);

  // Oldingi davr — faqat sonlar (taqqoslash uchun)
  let prev = { users: 0, enrollments: 0, revenue: 0, sales: 0 };
  if (prevWhere) {
    const [pu, pe, pp] = await Promise.all([
      prisma.user.count({ where: { role: 'USER', ...prevWhere } }),
      prisma.enrollment.count({ where: prevWhere }),
      prisma.payment.aggregate({
        where: { status: 'PAID', ...prevWhere },
        _sum: { amount: true },
        _count: true,
      }),
    ]);
    prev = { users: pu, enrollments: pe, revenue: pp._sum.amount || 0, sales: pp._count || 0 };
  }

  const current = {
    users: curUsers.length,
    enrollments: curEnroll.length,
    revenue: curPayments.reduce((s, p) => s + p.amount, 0),
    sales: curPayments.length,
  };

  res.json({
    success: true,
    stats: {
      users,
      courses,
      publishedCourses,
      enrollments,
      revenue: paidPayments._sum.amount || 0,
      salesCount: paidPayments._count || 0,
      recentPayments,
      topCourses,
      // Tanlangan davr bo'yicha
      period,
      current,
      previous: prev,
      growth: {
        users: growthPct(current.users, prev.users),
        enrollments: growthPct(current.enrollments, prev.enrollments),
        revenue: growthPct(current.revenue, prev.revenue),
        sales: growthPct(current.sales, prev.sales),
      },
      // Grafik uchun qatorlar
      charts: {
        users: bucketByDate(curUsers, days),
        enrollments: bucketByDate(curEnroll, days),
        revenue: bucketByDate(curPayments, days, (p) => p.amount),
      },
    },
  });
});

// So'rovdan sahifalash parametrlarini o'qish (limit 100 bilan cheklangan)
// GET /api/admin/attention — "Diqqat talab qiladi" ro'yxati.
// Boshqaruv paneli passiv hisobot bo'lib qolmasligi uchun: qo'l tekkizish
// kerak bo'lgan holatlar bir joyda, har biri tegishli bo'limga havola bilan.
const attention = asyncHandler(async (req, res) => {
  const monthAgo = new Date(Date.now() - 30 * 86400000);
  const dayAgo = new Date(Date.now() - 86400000);
  const hourAgo = new Date(Date.now() - 3600000);
  // Bir kunda shundan ko'p ro'yxatdan o'tish bo'lsa — tekshirib ko'rish kerak
  const SIGNUP_SPIKE = 30;

  const [
    draftCourses,
    pendingPayments,
    lowReviews,
    unassignedPaidCourses,
    signupsToday,
    unverifiedUsers,
    earnedAgg,
    paidAgg,
  ] = await Promise.all([
    prisma.course.count({ where: { published: false } }),
    prisma.payment.count({ where: { status: 'PENDING' } }),
    prisma.review.count({ where: { rating: { lte: 2 }, createdAt: { gte: monthAgo } } }),
    prisma.course.count({ where: { published: true, isFree: false, instructorId: null } }),
    prisma.user.count({ where: { createdAt: { gte: dayAgo } } }),
    // Bir soatdan oshgan, ammo hali tasdiqlanmagan akkauntlar.
    // Yangi ro'yxatdan o'tayotganlarni ogohlantirishga qo'shmaslik uchun 1 soat kutamiz.
    prisma.user.count({ where: { emailVerifiedAt: null, createdAt: { lt: hourAgo } } }),
    prisma.earning.groupBy({ by: ['instructorId'], _sum: { instructorAmount: true } }),
    prisma.payout.groupBy({ by: ['instructorId'], where: { status: 'PAID' }, _sum: { amount: true } }),
  ]);

  // Ustoz kesimida qoldiq: ishlagani − o'tkazilgani
  const paidByInstructor = new Map(paidAgg.map((p) => [p.instructorId, p._sum.amount || 0]));
  let unpaidTotal = 0;
  let unpaidInstructors = 0;
  for (const e of earnedAgg) {
    const pending = (e._sum.instructorAmount || 0) - (paidByInstructor.get(e.instructorId) || 0);
    if (pending > 0) {
      unpaidTotal += pending;
      unpaidInstructors += 1;
    }
  }

  // Faqat haqiqatan e'tibor talab qiladiganlari qaytariladi
  const items = [];

  // Xavfsizlik signallari birinchi o'rinda
  if (signupsToday > SIGNUP_SPIKE) {
    items.push({
      key: 'signupSpike',
      tone: 'rose',
      count: signupsToday,
      title: `Oxirgi 24 soatda ${signupsToday} ta yangi ro'yxatdan o'tish`,
      text: 'Odatdagidan ko\'p — bot hujumi bo\'lmaganini tekshiring',
      href: '/admin/users',
      action: 'Odamlarni ko\'rish',
    });
  }
  if (unverifiedUsers > 0) {
    items.push({
      key: 'unverifiedUsers',
      tone: 'slate',
      count: unverifiedUsers,
      title: `${unverifiedUsers} ta akkaunt emailini tasdiqlamagan`,
      text: 'Ular tizimga kira olmaydi. Ko\'p bo\'lsa — soxta ro\'yxatdan o\'tish belgisi',
      href: '/admin/users?verified=no',
      action: 'Ko\'rib chiqish',
    });
  }

  if (draftCourses > 0) {
    items.push({
      key: 'draftCourses',
      tone: 'slate',
      count: draftCourses,
      title: `${draftCourses} ta kurs qoralamada`,
      text: 'Nashr etilmagan — o\'quvchilar ko\'ra olmaydi',
      href: '/admin/courses',
      action: 'Kurslarga o\'tish',
    });
  }
  if (pendingPayments > 0) {
    items.push({
      key: 'pendingPayments',
      tone: 'amber',
      count: pendingPayments,
      title: `${pendingPayments} ta to'lov kutilmoqda`,
      text: 'Yakunlanmagan tranzaksiyalar — tekshirib chiqing',
      href: '/admin/earnings?tab=payments&status=PENDING',
      action: 'To\'lovlarni ko\'rish',
    });
  }
  if (unpaidTotal > 0) {
    items.push({
      key: 'unpaidPayouts',
      tone: 'amber',
      count: unpaidInstructors,
      amount: unpaidTotal,
      title: `${unpaidInstructors} ta ustozga to'lanmagan qoldiq bor`,
      text: 'Ishlagan, ammo hali o\'tkazilmagan summa',
      href: '/admin/earnings?tab=instructors',
      action: 'Moliyaga o\'tish',
    });
  }
  if (lowReviews > 0) {
    items.push({
      key: 'lowReviews',
      tone: 'rose',
      count: lowReviews,
      title: `${lowReviews} ta past baho (1–2 yulduz)`,
      text: 'So\'nggi 30 kunda qoldirilgan — sababini ko\'rib chiqing',
      href: '/admin/reviews',
      action: 'Sharhlarni ko\'rish',
    });
  }
  if (unassignedPaidCourses > 0) {
    items.push({
      key: 'unassignedCourses',
      tone: 'indigo',
      count: unassignedPaidCourses,
      title: `${unassignedPaidCourses} ta pullik kursda ustoz yo'q`,
      text: 'Bunday sotuvdan ustozga ulush yozilmaydi',
      href: '/admin/courses',
      action: 'Ustoz biriktirish',
    });
  }

  res.json({ success: true, items });
});

// GET /api/admin/search?q= — panel bo'ylab tezkor qidiruv (Ctrl+K).
// Odam, kurs va to'lov bo'yicha bir nechta eng mos natija qaytaradi.
const search = asyncHandler(async (req, res) => {
  const q = (req.query.q || '').trim();
  if (q.length < 2) {
    return res.json({ success: true, users: [], courses: [], payments: [] });
  }
  const like = { contains: q, mode: 'insensitive' };

  const [users, courses, payments] = await Promise.all([
    prisma.user.findMany({
      where: { OR: [{ fullName: like }, { email: like }] },
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: { id: true, fullName: true, email: true, role: true },
    }),
    prisma.course.findMany({
      where: { OR: [{ title: like }, { slug: like }] },
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, slug: true, published: true },
    }),
    prisma.payment.findMany({
      where: {
        OR: [
          { transactionId: like },
          { user: { OR: [{ fullName: like }, { email: like }] } },
          { course: { title: like } },
        ],
      },
      take: 4,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, amount: true, status: true, createdAt: true,
        user: { select: { fullName: true } },
        course: { select: { title: true } },
      },
    }),
  ]);

  res.json({ success: true, users, courses, payments });
});

function pageParams(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  return { page, limit, skip: (page - 1) * limit };
}

// GET /api/admin/users — "Odamlar" ro'yxati (o'quvchi, ustoz va bosh admin bir joyda)
// Qidiruv (?q=), rol filtri (?role=) va sahifalash (?page=&limit=) bilan.
// Ustozlar uchun biriktirilgan kurslar ham qaytadi — alohida so'rov kerak emas.
const users = asyncHandler(async (req, res) => {
  const { page, limit, skip } = pageParams(req.query);
  const q = (req.query.q || '').trim();
  const role = req.query.role;

  // Qidiruv shartini rol filtridan ajratamiz: rol yorliqlaridagi hisoblagichlar
  // joriy qidiruvga mos, ammo tanlangan roldan qat'i nazar hisoblanadi.
  const searchWhere = q
    ? {
      OR: [
        { fullName: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ],
    }
    : {};

  const where = { ...searchWhere };
  if (['USER', 'ADMIN', 'INSTRUCTOR'].includes(role)) where.role = role;
  // Tasdiqlanganlik bo'yicha filtr (?verified=yes|no)
  if (req.query.verified === 'no') where.emailVerifiedAt = null;
  if (req.query.verified === 'yes') where.emailVerifiedAt = { not: null };

  const [list, total, grouped] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true, fullName: true, email: true, role: true, createdAt: true, emailVerifiedAt: true, phone: true,
        _count: { select: { enrollments: true, certificates: true } },
        taughtCourses: { select: { id: true, title: true, slug: true } },
      },
    }),
    prisma.user.count({ where }),
    prisma.user.groupBy({ by: ['role'], where: searchWhere, _count: { _all: true } }),
  ]);

  const roleCounts = { all: 0, USER: 0, INSTRUCTOR: 0, ADMIN: 0 };
  for (const g of grouped) {
    roleCounts[g.role] = g._count._all;
    roleCounts.all += g._count._all;
  }

  res.json({
    success: true,
    users: list,
    roleCounts,
    pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
  });
});

const createUserSchema = z.object({
  fullName: z.string().min(2, 'Ism juda qisqa').max(80),
  email: z.string().email('Email noto\'g\'ri'),
  password: z.string().min(6, 'Parol kamida 6 belgi'),
  // "Odamlar" sahifasi uchta rolni ham shu yerdan yaratadi.
  role: z.enum(['USER', 'INSTRUCTOR', 'ADMIN']).default('USER'),
});

// POST /api/admin/users — yangi foydalanuvchi yaratish (bosh admin)
const createUser = asyncHandler(async (req, res) => {
  const data = createUserSchema.parse(req.body);
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw ApiError.conflict('Bu email allaqachon band');

  const passwordHash = await bcrypt.hash(data.password, 10);
  const user = await prisma.user.create({
    data: { fullName: data.fullName, email: data.email, passwordHash, role: data.role },
    select: {
      id: true, fullName: true, email: true, role: true, createdAt: true, emailVerifiedAt: true, phone: true,
      _count: { select: { enrollments: true, certificates: true } },
      taughtCourses: { select: { id: true, title: true, slug: true } },
    },
  });
  res.status(201).json({ success: true, message: 'Foydalanuvchi yaratildi', user });
});

// DELETE /api/admin/users/:id — foydalanuvchini o'chirish (bosh admin)
const deleteUser = asyncHandler(async (req, res) => {
  // O'zini o'chirishga yo'l qo'ymaymiz (tizimdan chiqib qolmaslik uchun)
  if (req.params.id === req.user.id) {
    throw ApiError.badRequest('O\'z akkauntingizni o\'chira olmaysiz');
  }
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) throw ApiError.notFound('Foydalanuvchi topilmadi');

  // Oxirgi bosh adminni o'chirishdan himoya
  if (user.role === 'ADMIN') {
    const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
    if (adminCount <= 1) throw ApiError.badRequest('Oxirgi bosh adminni o\'chirib bo\'lmaydi');
  }

  // Bog'liq yozuvlar (yozilish, to'lov, sertifikat, progress, xabar) sxema bo'yicha
  // kaskad o'chadi; ustoz kurslari esa saqlanadi (instructorId null bo'ladi).
  await prisma.user.delete({ where: { id: req.params.id } });
  res.json({ success: true, message: 'Foydalanuvchi o\'chirildi' });
});

// ---------- Ustoz adminlar (INSTRUCTOR) ----------

const instructorSchema = z.object({
  fullName: z.string().min(2, 'Ism juda qisqa').max(80),
  email: z.string().email('Email noto\'g\'ri'),
  password: z.string().min(6, 'Parol kamida 6 belgi'),
});

// GET /api/admin/instructors — ustoz adminlar ro'yxati (biriktirilgan kurslari bilan)
const listInstructors = asyncHandler(async (req, res) => {
  const list = await prisma.user.findMany({
    where: { role: 'INSTRUCTOR' },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, fullName: true, email: true, createdAt: true,
      taughtCourses: { select: { id: true, title: true, slug: true } },
    },
  });
  res.json({ success: true, instructors: list });
});

// POST /api/admin/instructors — yangi ustoz admin yaratish
const createInstructor = asyncHandler(async (req, res) => {
  const data = instructorSchema.parse(req.body);
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw ApiError.conflict('Bu email allaqachon band');

  const passwordHash = await bcrypt.hash(data.password, 10);
  const user = await prisma.user.create({
    data: { fullName: data.fullName, email: data.email, passwordHash, role: 'INSTRUCTOR' },
    select: { id: true, fullName: true, email: true, role: true, createdAt: true },
  });
  res.status(201).json({ success: true, message: 'Ustoz admin yaratildi', instructor: { ...user, taughtCourses: [] } });
});

// DELETE /api/admin/instructors/:id — ustoz adminni o'chirish
// Uning kurslari o'chmaydi, faqat biriktirish uziladi (schema: onDelete SetNull)
const deleteInstructor = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user || user.role !== 'INSTRUCTOR') throw ApiError.notFound('Ustoz admin topilmadi');
  await prisma.user.delete({ where: { id: req.params.id } });
  res.json({ success: true, message: 'Ustoz admin o\'chirildi' });
});

// ---------- Ustoz o'qitish statistikasi ----------
// GET /api/admin/teaching/stats — ustozning o'z kurslari bo'yicha statistikasi.
// Bosh admin uchun barcha kurslar, ustoz uchun faqat biriktirilganlari.
const teachingStats = asyncHandler(async (req, res) => {
  const where = req.user.role === 'INSTRUCTOR' ? { instructorId: req.user.id } : {};

  const courses = await prisma.course.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: { id: true, title: true, slug: true, price: true, isFree: true, published: true },
  });
  const ids = courses.map((c) => c.id);

  // Kurs yo'q bo'lsa — bo'sh statistika
  if (ids.length === 0) {
    return res.json({
      success: true,
      stats: { totals: emptyTotals(), byYear: [], courses: [] },
    });
  }

  // Kerakli xom ma'lumotlar (seed hajmida — findMany yetarli)
  const [enrollments, certificates, payments, progressRows] = await Promise.all([
    prisma.enrollment.findMany({
      where: { courseId: { in: ids } },
      select: { courseId: true, userId: true, createdAt: true },
    }),
    prisma.certificate.findMany({
      where: { courseId: { in: ids } },
      select: { courseId: true },
    }),
    prisma.payment.findMany({
      where: { courseId: { in: ids }, status: 'PAID' },
      select: { courseId: true, amount: true },
    }),
    prisma.lessonProgress.findMany({
      where: { completed: true, lesson: { section: { courseId: { in: ids } } } },
      select: { userId: true, lesson: { select: { section: { select: { courseId: true } } } } },
    }),
  ]);

  const thisYear = new Date().getFullYear();

  // Kurs bo'yicha guruhlash uchun yordamchi hisoblagichlar
  const enrolledBy = countBy(enrollments, (e) => e.courseId);
  const enrolledThisYearBy = countBy(
    enrollments.filter((e) => new Date(e.createdAt).getFullYear() === thisYear),
    (e) => e.courseId
  );
  const certBy = countBy(certificates, (c) => c.courseId);

  // Daromad va sotuvlar kurs bo'yicha
  const revenueBy = {};
  const salesBy = {};
  for (const p of payments) {
    revenueBy[p.courseId] = (revenueBy[p.courseId] || 0) + p.amount;
    salesBy[p.courseId] = (salesBy[p.courseId] || 0) + 1;
  }

  // Faol o'quvchilar (kamida 1 dars tugatgan) — kurs bo'yicha noyob userId to'plami
  const activeSetBy = {};
  for (const pr of progressRows) {
    const cid = pr.lesson.section.courseId;
    (activeSetBy[cid] = activeSetBy[cid] || new Set()).add(pr.userId);
  }

  // Yillar bo'yicha yozilishlar (barcha kurslar bo'yicha jami)
  const byYearMap = {};
  for (const e of enrollments) {
    const y = new Date(e.createdAt).getFullYear();
    byYearMap[y] = (byYearMap[y] || 0) + 1;
  }
  const byYear = Object.entries(byYearMap)
    .map(([year, count]) => ({ year: Number(year), count }))
    .sort((a, b) => a.year - b.year);

  // Har bir kurs bo'yicha ko'rsatkichlar
  const courseStats = courses.map((c) => {
    const enrolled = enrolledBy[c.id] || 0;
    const completed = certBy[c.id] || 0;
    const active = activeSetBy[c.id] ? activeSetBy[c.id].size : 0;
    return {
      id: c.id,
      title: c.title,
      slug: c.slug,
      published: c.published,
      isFree: c.isFree,
      price: c.price,
      enrolled,
      completed, // sertifikat olgan (kursni tugatgan)
      notCompleted: Math.max(0, enrolled - completed),
      active, // kamida 1 dars tugatgan
      notStarted: Math.max(0, enrolled - active), // yozilgan, ammo boshlamagan
      enrolledThisYear: enrolledThisYearBy[c.id] || 0,
      revenue: revenueBy[c.id] || 0,
      sales: salesBy[c.id] || 0,
      completionRate: enrolled ? Math.round((completed / enrolled) * 100) : 0,
    };
  });

  // Umumiy yig'indilar
  const totals = courseStats.reduce(
    (acc, s) => ({
      courses: acc.courses + 1,
      enrolled: acc.enrolled + s.enrolled,
      completed: acc.completed + s.completed,
      notCompleted: acc.notCompleted + s.notCompleted,
      active: acc.active + s.active,
      enrolledThisYear: acc.enrolledThisYear + s.enrolledThisYear,
      revenue: acc.revenue + s.revenue,
      sales: acc.sales + s.sales,
    }),
    emptyTotals()
  );
  totals.completionRate = totals.enrolled
    ? Math.round((totals.completed / totals.enrolled) * 100)
    : 0;

  res.json({ success: true, stats: { totals, byYear, courses: courseStats } });
});

function emptyTotals() {
  return {
    courses: 0, enrolled: 0, completed: 0, notCompleted: 0,
    active: 0, enrolledThisYear: 0, revenue: 0, sales: 0, completionRate: 0,
  };
}

function countBy(arr, keyFn) {
  const m = {};
  for (const item of arr) {
    const k = keyFn(item);
    m[k] = (m[k] || 0) + 1;
  }
  return m;
}

// ---------- Foydalanuvchi tafsiloti va boshqaruvi ----------

// GET /api/admin/users/:id — bitta foydalanuvchining to'liq ma'lumoti:
// profil, kurslari (progress + muddat), to'lovlari, sertifikatlari, sharhlari
const getUserDetail = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: { id: true, fullName: true, email: true, role: true, createdAt: true },
  });
  if (!user) throw ApiError.notFound('Foydalanuvchi topilmadi');

  const [enrollments, payments, certificates, reviews] = await Promise.all([
    prisma.enrollment.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        course: {
          select: {
            id: true, title: true, slug: true, level: true,
            accessMonths: true, isFree: true, price: true,
          },
        },
      },
    }),
    prisma.payment.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: { course: { select: { id: true, title: true, slug: true } } },
    }),
    prisma.certificate.findMany({
      where: { userId: user.id },
      orderBy: { issuedAt: 'desc' },
      include: { course: { select: { id: true, title: true, slug: true } } },
    }),
    prisma.review.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: { course: { select: { id: true, title: true, slug: true } } },
    }),
  ]);

  // Har bir kurs bo'yicha progress va foydalanish muddati
  const withProgress = await Promise.all(
    enrollments.map(async (e) => ({
      ...e,
      progress: await computeProgress(user.id, e.courseId),
      access: accessInfo(e.expiresAt, accessMonthsFor(e.course)),
    }))
  );

  const paidTotal = payments
    .filter((p) => p.status === 'PAID')
    .reduce((sum, p) => sum + p.amount, 0);

  res.json({
    success: true,
    user,
    enrollments: withProgress,
    payments,
    certificates,
    reviews,
    summary: {
      enrollments: enrollments.length,
      certificates: certificates.length,
      reviews: reviews.length,
      paidTotal,
    },
  });
});

// PATCH /api/admin/users/:id/role — foydalanuvchi rolini o'zgartirish
// (o'chirib qayta yaratmasdan — progressi saqlanadi)
const updateUserRole = asyncHandler(async (req, res) => {
  const role = req.body.role;
  if (!['USER', 'INSTRUCTOR', 'ADMIN'].includes(role)) {
    throw ApiError.badRequest('Rol noto\'g\'ri');
  }
  if (req.params.id === req.user.id) {
    throw ApiError.badRequest('O\'z rolingizni o\'zgartira olmaysiz');
  }

  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) throw ApiError.notFound('Foydalanuvchi topilmadi');
  if (user.role === role) {
    return res.json({ success: true, message: 'Rol o\'zgarmadi', user });
  }

  // Oxirgi bosh adminni pastga tushirishdan himoya
  if (user.role === 'ADMIN') {
    const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
    if (adminCount <= 1) throw ApiError.badRequest('Oxirgi bosh admin rolini o\'zgartirib bo\'lmaydi');
  }

  const updated = await prisma.user.update({
    where: { id: req.params.id },
    data: { role },
    select: { id: true, fullName: true, email: true, role: true, createdAt: true },
  });
  res.json({ success: true, message: 'Rol yangilandi', user: updated });
});

// POST /api/admin/users/:id/enrollments — foydalanuvchini kursga qo'lda yozish
// body: { courseId, months? } — to'lovsiz ruxsat berish (promo, kompensatsiya)
const enrollUserToCourse = asyncHandler(async (req, res) => {
  const { courseId, months } = req.body;
  if (!courseId) throw ApiError.badRequest('courseId shart');

  const [user, course] = await Promise.all([
    prisma.user.findUnique({ where: { id: req.params.id } }),
    prisma.course.findUnique({ where: { id: courseId } }),
  ]);
  if (!user) throw ApiError.notFound('Foydalanuvchi topilmadi');
  if (!course) throw ApiError.notFound('Kurs topilmadi');

  const n = Number.isInteger(months) && months > 0 ? months : accessMonthsFor(course);
  const expiresAt = computeExpiry(n);

  // Mavjud bo'lsa muddatni yangilaymiz (progress saqlanadi), aks holda yaratamiz
  const existing = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: user.id, courseId } },
  });
  const enrollment = existing
    ? await prisma.enrollment.update({ where: { id: existing.id }, data: { expiresAt } })
    : await prisma.enrollment.create({ data: { userId: user.id, courseId, expiresAt } });

  res.status(existing ? 200 : 201).json({
    success: true,
    message: existing ? 'Foydalanish muddati yangilandi' : 'Kursga yozildi',
    enrollment,
  });
});

// PATCH /api/admin/enrollments/:id — foydalanish muddatini uzaytirish
// body: { months } — joriy muddat tugagan bo'lsa bugundan, aks holda mavjud muddatdan qo'shiladi
const extendEnrollment = asyncHandler(async (req, res) => {
  const months = parseInt(req.body.months, 10);
  if (!Number.isInteger(months) || months < 1 || months > 60) {
    throw ApiError.badRequest('months 1 dan 60 gacha bo\'lishi kerak');
  }

  const enrollment = await prisma.enrollment.findUnique({ where: { id: req.params.id } });
  if (!enrollment) throw ApiError.notFound('Yozilish topilmadi');

  // Muddati hali tugamagan bo'lsa — ustiga qo'shamiz, tugagan bo'lsa bugundan boshlaymiz
  const now = new Date();
  const base = enrollment.expiresAt && new Date(enrollment.expiresAt) > now
    ? new Date(enrollment.expiresAt)
    : now;

  const updated = await prisma.enrollment.update({
    where: { id: enrollment.id },
    data: { expiresAt: computeExpiry(months, base) },
  });
  res.json({ success: true, message: `Muddat ${months} oyga uzaytirildi`, enrollment: updated });
});

// DELETE /api/admin/enrollments/:id — kursdan chiqarish (progress ham o'chadi)
const removeEnrollment = asyncHandler(async (req, res) => {
  const enrollment = await prisma.enrollment.findUnique({ where: { id: req.params.id } });
  if (!enrollment) throw ApiError.notFound('Yozilish topilmadi');
  await prisma.enrollment.delete({ where: { id: enrollment.id } });
  res.json({ success: true, message: 'Kursdan chiqarildi' });
});

// ---------- Sertifikatlar ----------

// GET /api/admin/certificates — berilgan sertifikatlar (qidiruv + sahifalash)
const listCertificates = asyncHandler(async (req, res) => {
  const { page, limit, skip } = pageParams(req.query);
  const q = (req.query.q || '').trim();

  const where = {};
  if (q) {
    where.OR = [
      { serial: { contains: q, mode: 'insensitive' } },
      { user: { fullName: { contains: q, mode: 'insensitive' } } },
      { user: { email: { contains: q, mode: 'insensitive' } } },
      { course: { title: { contains: q, mode: 'insensitive' } } },
    ];
  }

  const [list, total] = await Promise.all([
    prisma.certificate.findMany({
      where,
      orderBy: { issuedAt: 'desc' },
      skip,
      take: limit,
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        course: { select: { id: true, title: true, slug: true } },
      },
    }),
    prisma.certificate.count({ where }),
  ]);

  res.json({
    success: true,
    certificates: list,
    pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
  });
});

// DELETE /api/admin/certificates/:id — sertifikatni bekor qilish
// Eslatma: foydalanuvchi kursni yana 100% holatda ushlab tursa, keyingi
// vazifa bajarilishida sertifikat qayta beriladi (issueCertificateIfComplete).
const revokeCertificate = asyncHandler(async (req, res) => {
  const cert = await prisma.certificate.findUnique({ where: { id: req.params.id } });
  if (!cert) throw ApiError.notFound('Sertifikat topilmadi');
  await prisma.certificate.delete({ where: { id: req.params.id } });
  res.json({ success: true, message: 'Sertifikat bekor qilindi' });
});

// ---------- Sharhlar moderatsiyasi ----------

// GET /api/admin/reviews — barcha sharhlar (qidiruv, filtr, sahifalash)
// ?q= matn/ism/email, ?rating=1..5, ?withComment=1 (faqat izohlilari), ?courseId=
const listReviews = asyncHandler(async (req, res) => {
  const { page, limit, skip } = pageParams(req.query);
  const q = (req.query.q || '').trim();
  const rating = parseInt(req.query.rating, 10);

  const where = {};
  if (q) {
    where.OR = [
      { comment: { contains: q, mode: 'insensitive' } },
      { user: { fullName: { contains: q, mode: 'insensitive' } } },
      { user: { email: { contains: q, mode: 'insensitive' } } },
      { course: { title: { contains: q, mode: 'insensitive' } } },
    ];
  }
  if (rating >= 1 && rating <= 5) where.rating = rating;
  if (req.query.withComment === '1') where.comment = { not: null };
  if (req.query.courseId) where.courseId = req.query.courseId;

  const [list, total] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        course: { select: { id: true, title: true, slug: true } },
      },
    }),
    prisma.review.count({ where }),
  ]);

  res.json({
    success: true,
    reviews: list,
    pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
  });
});

// DELETE /api/admin/reviews/:id — nomaqbul sharhni o'chirish
const deleteReview = asyncHandler(async (req, res) => {
  const review = await prisma.review.findUnique({ where: { id: req.params.id } });
  if (!review) throw ApiError.notFound('Sharh topilmadi');
  await prisma.review.delete({ where: { id: req.params.id } });
  res.json({ success: true, message: 'Sharh o\'chirildi' });
});

// ---------- To'lovlar ----------

// GET /api/admin/payments — to'lovlar ro'yxati (qidiruv, status filtri, sahifalash)
// ?q= ism/email/kurs/tranzaksiya, ?status=PENDING|PAID|FAILED, ?provider=CLICK|PAYME
const listPayments = asyncHandler(async (req, res) => {
  const { page, limit, skip } = pageParams(req.query);
  const q = (req.query.q || '').trim();
  const { status, provider } = req.query;

  const where = {};
  if (q) {
    where.OR = [
      { transactionId: { contains: q, mode: 'insensitive' } },
      { user: { fullName: { contains: q, mode: 'insensitive' } } },
      { user: { email: { contains: q, mode: 'insensitive' } } },
      { course: { title: { contains: q, mode: 'insensitive' } } },
    ];
  }
  if (['PENDING', 'PAID', 'FAILED'].includes(status)) where.status = status;
  if (['CLICK', 'PAYME'].includes(provider)) where.provider = provider;

  const [list, total, paidAgg] = await Promise.all([
    prisma.payment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        course: { select: { id: true, title: true, slug: true } },
      },
    }),
    prisma.payment.count({ where }),
    // Joriy filtr bo'yicha to'langan summa va soni
    prisma.payment.aggregate({
      where: { ...where, status: 'PAID' },
      _sum: { amount: true },
      _count: true,
    }),
  ]);

  res.json({
    success: true,
    payments: list,
    summary: { paidRevenue: paidAgg._sum.amount || 0, paidCount: paidAgg._count || 0 },
    pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
  });
});

module.exports = {
  stats, attention, search, users, createUser, deleteUser,
  listInstructors, createInstructor, deleteInstructor, teachingStats,
  listReviews, deleteReview, listPayments,
  getUserDetail, updateUserRole,
  enrollUserToCourse, extendEnrollment, removeEnrollment,
  listCertificates, revokeCertificate,
};
