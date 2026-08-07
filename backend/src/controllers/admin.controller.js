// Admin controlleri — statistika, foydalanuvchilar va ustoz adminlar
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

// GET /api/admin/stats — umumiy statistika
const stats = asyncHandler(async (req, res) => {
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
    },
  });
});

// GET /api/admin/users — foydalanuvchilar ro'yxati
const users = asyncHandler(async (req, res) => {
  const list = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, fullName: true, email: true, role: true, createdAt: true,
      _count: { select: { enrollments: true, certificates: true } },
    },
  });
  res.json({ success: true, users: list });
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

module.exports = {
  stats, users, createUser, deleteUser,
  listInstructors, createInstructor, deleteInstructor, teachingStats,
};
