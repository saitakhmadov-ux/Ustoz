// Kurs controlleri
const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { courseSchema } = require('../validators/course.validator');
const { uniqueSlug } = require('../utils/slug');
const { assertCourseAccess } = require('../utils/courseAccess');
const { attachRatingsToCourses, getCourseRating } = require('../utils/rating');

// Kartochka uchun kurs shakli
const cardSelect = {
  id: true,
  title: true,
  slug: true,
  thumbnail: true,
  authorName: true,
  price: true,
  isFree: true,
  level: true,
  createdAt: true,
  category: { select: { name: true, slug: true } },
  _count: { select: { enrollments: true } },
};

// GET /api/courses — nashr etilgan kurslar (filtrlar bilan)
// query: category(slug), level, search, isFree, page, limit
const list = asyncHandler(async (req, res) => {
  const { category, level, search, isFree } = req.query;
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const limit = Math.min(48, Math.max(1, parseInt(req.query.limit || '12', 10)));

  const where = { published: true };
  if (category) where.category = { slug: category };
  if (level) where.level = level;
  if (isFree === 'true') where.isFree = true;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { authorName: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [total, courses] = await Promise.all([
    prisma.course.count({ where }),
    prisma.course.findMany({
      where,
      select: cardSelect,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  await attachRatingsToCourses(courses);

  res.json({
    success: true,
    courses,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
  });
});

// GET /api/courses/top — eng yuqori baholi nashr etilgan kurslar
// query: limit (standart 4). Faqat kamida bitta bahosi bor kurslar.
const topRated = asyncHandler(async (req, res) => {
  const limit = Math.min(12, Math.max(1, parseInt(req.query.limit || '4', 10)));
  const courses = await prisma.course.findMany({
    where: { published: true },
    select: cardSelect,
  });
  await attachRatingsToCourses(courses);
  const top = courses
    .filter((c) => c.rating.count > 0)
    .sort((a, b) => b.rating.average - a.rating.average || b.rating.count - a.rating.count)
    .slice(0, limit);
  res.json({ success: true, courses: top });
});

// GET /api/courses/:slug — kurs tafsiloti (darslar tuzilishi bilan)
const getBySlug = asyncHandler(async (req, res) => {
  const course = await prisma.course.findUnique({
    where: { slug: req.params.slug },
    include: {
      category: { select: { name: true, slug: true } },
      sections: {
        orderBy: { order: 'asc' },
        include: {
          lessons: {
            orderBy: { order: 'asc' },
            select: {
              id: true,
              title: true,
              order: true,
              isFreePreview: true,
              videoUrl: true, // preview uchun kerak bo'lishi mumkin
              _count: { select: { questions: true } },
            },
          },
        },
      },
      _count: { select: { enrollments: true } },
    },
  });

  if (!course || (!course.published && (!req.user || req.user.role !== 'ADMIN'))) {
    throw ApiError.notFound('Kurs topilmadi');
  }

  // Darslar sonini va foydalanuvchi yozilganini aniqlash
  const lessonCount = course.sections.reduce((n, s) => n + s.lessons.length, 0);

  let isEnrolled = false;
  if (req.user) {
    const enr = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: req.user.id, courseId: course.id } },
    });
    isEnrolled = !!enr;
  }

  // Yozilmagan foydalanuvchi uchun video URL'ni faqat preview darslarda qoldiramiz
  const sections = course.sections.map((s) => ({
    ...s,
    lessons: s.lessons.map((l) => ({
      ...l,
      videoUrl: isEnrolled || course.isFree || l.isFreePreview ? l.videoUrl : null,
      questionCount: l._count.questions,
      _count: undefined,
    })),
  }));

  const rating = await getCourseRating(course.id);

  res.json({
    success: true,
    course: { ...course, sections, lessonCount, isEnrolled, rating },
  });
});

// ---------- Admin CRUD ----------

// POST /api/courses (admin)
const create = asyncHandler(async (req, res) => {
  const data = courseSchema.parse(req.body);

  // Kategoriya mavjudligini tekshirish
  const cat = await prisma.category.findUnique({ where: { id: data.categoryId } });
  if (!cat) throw ApiError.badRequest('Bunday kategoriya yo\'q');

  const slug = data.slug || (await uniqueSlug(data.title, async (s) =>
    !!(await prisma.course.findUnique({ where: { slug: s } }))
  ));

  const course = await prisma.course.create({
    data: {
      title: data.title,
      slug,
      description: data.description,
      thumbnail: data.thumbnail || null,
      authorName: data.authorName,
      price: data.isFree ? 0 : data.price,
      isFree: data.isFree,
      level: data.level,
      accessMonths: data.accessMonths ?? null,
      codePlayground: data.codePlayground ?? false,
      categoryId: data.categoryId,
      published: data.published ?? false,
      instructorId: data.instructorId || null,
    },
  });
  res.status(201).json({ success: true, message: 'Kurs yaratildi', course });
});

// PUT /api/courses/:id (admin yoki biriktirilgan ustoz)
// Ustoz faqat kontent maydonlarini o'zgartira oladi; narx, nashr, kategoriya,
// ustoz biriktirish faqat bosh admin ixtiyorida.
const update = asyncHandler(async (req, res) => {
  const existing = await prisma.course.findUnique({ where: { id: req.params.id } });
  if (!existing) throw ApiError.notFound('Kurs topilmadi');

  // Egalik: admin har doim, ustoz faqat o'z kursi
  await assertCourseAccess(req.user, req.params.id);
  const isAdmin = req.user.role === 'ADMIN';

  const data = courseSchema.partial().parse(req.body);

  // Ustoz o'zgartira oladigan maydonlar (kontent)
  const updateData = {
    ...(data.title !== undefined && { title: data.title }),
    ...(data.description !== undefined && { description: data.description }),
    ...(data.thumbnail !== undefined && { thumbnail: data.thumbnail || null }),
    ...(data.authorName !== undefined && { authorName: data.authorName }),
    ...(data.level !== undefined && { level: data.level }),
  };

  // Faqat bosh admin uchun qo'shimcha maydonlar
  if (isAdmin) {
    const isFree = data.isFree ?? existing.isFree;
    Object.assign(updateData, {
      ...(data.slug !== undefined && { slug: data.slug }),
      ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
      ...(data.published !== undefined && { published: data.published }),
      ...(data.isFree !== undefined && { isFree: data.isFree }),
      ...(data.price !== undefined || data.isFree !== undefined
        ? { price: isFree ? 0 : (data.price ?? existing.price) }
        : {}),
      ...(data.instructorId !== undefined && { instructorId: data.instructorId || null }),
      ...(data.accessMonths !== undefined && { accessMonths: data.accessMonths ?? null }),
      ...(data.codePlayground !== undefined && { codePlayground: data.codePlayground }),
    });
  }

  const course = await prisma.course.update({ where: { id: req.params.id }, data: updateData });
  res.json({ success: true, message: 'Kurs yangilandi', course });
});

// PATCH /api/courses/:id/publish (admin) — nashr holatini almashtirish
const togglePublish = asyncHandler(async (req, res) => {
  const existing = await prisma.course.findUnique({ where: { id: req.params.id } });
  if (!existing) throw ApiError.notFound('Kurs topilmadi');
  const course = await prisma.course.update({
    where: { id: req.params.id },
    data: { published: !existing.published },
  });
  res.json({
    success: true,
    message: course.published ? 'Kurs nashr etildi' : 'Kurs nashrdan olindi',
    course,
  });
});

// DELETE /api/courses/:id (admin)
const remove = asyncHandler(async (req, res) => {
  await prisma.course.delete({ where: { id: req.params.id } });
  res.json({ success: true, message: 'Kurs o\'chirildi' });
});

// GET /api/courses/admin/all — kurslar ro'yxati (nashr etilmaganlar ham)
// Bosh admin: barcha kurslar. Ustoz: faqat o'ziga biriktirilganlari.
const adminList = asyncHandler(async (req, res) => {
  const where = req.user.role === 'INSTRUCTOR' ? { instructorId: req.user.id } : {};
  const courses = await prisma.course.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      category: { select: { name: true, slug: true } },
      instructor: { select: { id: true, fullName: true, email: true } },
      _count: { select: { enrollments: true, sections: true } },
    },
  });
  res.json({ success: true, courses });
});

module.exports = { list, topRated, getBySlug, create, update, togglePublish, remove, adminList };
