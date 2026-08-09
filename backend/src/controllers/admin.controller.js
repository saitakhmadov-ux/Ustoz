// Admin controlleri — statistika, foydalanuvchilar va ustoz adminlar
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { computeProgress } = require('./enrollment.controller');
const { computeExpiry, accessInfo, accessMonthsFor } = require('../utils/learnProgress');

// Davr (period) parametrini kunlarga aylantirish. null — butun davr.
const PERIOD_DAYS = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 };

// O'sish foizi: oldingi davrga nisbatan. Oldingi 0 bo'lsa — yangi o'sish 100% deb olinadi.
function growthPct(current, previous) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

// Sanalar bo'yicha guruhlash (kunlik yoki oylik) — grafik uchun
function bucketByDate(rows, days, valueFn = () => 1) {
  const monthly = days === null || days > 90;
  const map = {};
  for (const r of rows) {
    const d = new Date(r.createdAt);
    const key = monthly
      ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      : d.toISOString().slice(0, 10);
    map[key] = (map[key] || 0) + valueFn(r);
  }
  return Object.entries(map)
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// GET /api/admin/stats — umumiy statistika
// ?period=7d|30d|90d|1y|all (standart 30d) — davr bo'yicha o'sish va grafik bilan
const stats = asyncHandler(async (req, res) => {
  // Faqat ruxsat etilgan qiymatlar (prototip zanjiriga tushmaslik uchun aniq ro'yxat)
  const allowed = ['7d', '30d', '90d', '1y', 'all'];
  const period = allowed.includes(req.query.period) ? req.query.period : '30d';
  const days = period === 'all' ? null : PERIOD_DAYS[period];

  // Joriy va oldingi davr chegaralari
  const now = new Date();
  const from = days === null ? null : new Date(now.getTime() - days * 86400000);
  const prevFrom = days === null ? null : new Date(now.getTime() - 2 * days * 86400000);

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
function pageParams(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  return { page, limit, skip: (page - 1) * limit };
}

// GET /api/admin/users — foydalanuvchilar ro'yxati
// Qidiruv (?q=), rol filtri (?role=) va sahifalash (?page=&limit=) bilan.
const users = asyncHandler(async (req, res) => {
  const { page, limit, skip } = pageParams(req.query);
  const q = (req.query.q || '').trim();
  const role = req.query.role;

  const where = {};
  if (q) {
    where.OR = [
      { fullName: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
    ];
  }
  if (['USER', 'ADMIN', 'INSTRUCTOR'].includes(role)) where.role = role;

  const [list, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true, fullName: true, email: true, role: true, createdAt: true,
        _count: { select: { enrollments: true, certificates: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  res.json({
    success: true,
    users: list,
    pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
  });
});

const createUserSchema = z.object({
  fullName: z.string().min(2, 'Ism juda qisqa').max(80),
  email: z.string().email('Email noto\'g\'ri'),
  password: z.string().min(6, 'Parol kamida 6 belgi'),
  // Bu sahifada oddiy foydalanuvchi yoki bosh admin yaratiladi.
  // Ustoz (INSTRUCTOR) alohida "Ustozlar" sahifasida boshqariladi.
  role: z.enum(['USER', 'ADMIN']).default('USER'),
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
      id: true, fullName: true, email: true, role: true, createdAt: true,
      _count: { select: { enrollments: true, certificates: true } },
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
  stats, users, createUser, deleteUser,
  listInstructors, createInstructor, deleteInstructor, teachingStats,
  listReviews, deleteReview, listPayments,
  getUserDetail, updateUserRole,
  enrollUserToCourse, extendEnrollment, removeEnrollment,
  listCertificates, revokeCertificate,
};
