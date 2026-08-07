// Kategoriya controlleri
const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { categorySchema } = require('../validators/course.validator');
const { uniqueSlug } = require('../utils/slug');
const { attachRatingsToCourses, categoryRatingMap } = require('../utils/rating');

// GET /api/categories — barcha kategoriyalar (kurslar soni bilan)
const list = asyncHandler(async (req, res) => {
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { courses: { where: { published: true } } } },
    },
  });
  const ratingMap = await categoryRatingMap(categories.map((c) => c.id));
  res.json({
    success: true,
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      icon: c.icon,
      courseCount: c._count.courses,
      rating: ratingMap[c.id] || { average: 0, ratedCourses: 0 },
    })),
  });
});

// GET /api/categories/:slug — kategoriya + uning nashr etilgan kurslari
const getBySlug = asyncHandler(async (req, res) => {
  const category = await prisma.category.findUnique({
    where: { slug: req.params.slug },
    include: {
      courses: {
        where: { published: true },
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { enrollments: true } } },
      },
    },
  });
  if (!category) throw ApiError.notFound('Kategoriya topilmadi');

  // Kurslarga reyting, kategoriyaga umumiy reyting qo'shamiz
  await attachRatingsToCourses(category.courses);
  const ratingMap = await categoryRatingMap([category.id]);

  res.json({
    success: true,
    category: { ...category, rating: ratingMap[category.id] || { average: 0, ratedCourses: 0 } },
  });
});

// POST /api/categories — yangi kategoriya (admin)
const create = asyncHandler(async (req, res) => {
  const data = categorySchema.parse(req.body);
  const slug = data.slug || (await uniqueSlug(data.name, async (s) =>
    !!(await prisma.category.findUnique({ where: { slug: s } }))
  ));
  const category = await prisma.category.create({
    data: { name: data.name, slug, description: data.description || null, icon: data.icon || null },
  });
  res.status(201).json({ success: true, message: 'Kategoriya yaratildi', category });
});

// PUT /api/categories/:id — tahrirlash (admin)
const update = asyncHandler(async (req, res) => {
  const data = categorySchema.partial().parse(req.body);
  const category = await prisma.category.update({
    where: { id: req.params.id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.slug !== undefined && { slug: data.slug }),
      ...(data.description !== undefined && { description: data.description || null }),
      ...(data.icon !== undefined && { icon: data.icon || null }),
    },
  });
  res.json({ success: true, message: 'Kategoriya yangilandi', category });
});

// DELETE /api/categories/:id — o'chirish (admin)
const remove = asyncHandler(async (req, res) => {
  const count = await prisma.course.count({ where: { categoryId: req.params.id } });
  if (count > 0) {
    throw ApiError.badRequest('Bu kategoriyada kurslar bor, avval ularni o\'chiring yoki ko\'chiring');
  }
  await prisma.category.delete({ where: { id: req.params.id } });
  res.json({ success: true, message: 'Kategoriya o\'chirildi' });
});

module.exports = { list, getBySlug, create, update, remove };
