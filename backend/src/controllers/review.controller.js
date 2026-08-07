// Kurs baholari (review) controlleri
const { z } = require('zod');
const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { getCourseRating, getRatingDistribution } = require('../utils/rating');

const reviewSchema = z.object({
  rating: z.number().int().min(1, 'Kamida 1 yulduz').max(5, 'Ko\'pi bilan 5 yulduz'),
  comment: z.string().max(1000).optional().nullable(),
});

// Slug bo'yicha kursni topish (id kerak bo'ladi)
async function findCourseBySlug(slug) {
  const course = await prisma.course.findUnique({
    where: { slug },
    select: { id: true, isFree: true },
  });
  if (!course) throw ApiError.notFound('Kurs topilmadi');
  return course;
}

// GET /api/courses/:slug/reviews — kurs baholari + xulosa (ochiq)
const list = asyncHandler(async (req, res) => {
  const course = await findCourseBySlug(req.params.slug);

  const [reviews, summary, distribution] = await Promise.all([
    prisma.review.findMany({
      where: { courseId: course.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { user: { select: { fullName: true, avatarUrl: true } } },
    }),
    getCourseRating(course.id),
    getRatingDistribution(course.id),
  ]);

  // Joriy foydalanuvchi holati
  let myReview = null;
  let canReview = false;
  if (req.user) {
    myReview = await prisma.review.findUnique({
      where: { userId_courseId: { userId: req.user.id, courseId: course.id } },
    });
    const enr = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: req.user.id, courseId: course.id } },
    });
    canReview = !!enr; // faqat kursga yozilganlar baho bera oladi
  }

  res.json({ success: true, summary, distribution, reviews, myReview, canReview });
});

// POST /api/courses/:slug/reviews — baho qoldirish yoki yangilash (yozilganlar)
const upsert = asyncHandler(async (req, res) => {
  const data = reviewSchema.parse(req.body);
  const course = await findCourseBySlug(req.params.slug);

  // Faqat kursga yozilgan foydalanuvchi baho bera oladi
  const enr = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: req.user.id, courseId: course.id } },
  });
  if (!enr) throw ApiError.forbidden('Baho berish uchun avval kursga yoziling');

  const review = await prisma.review.upsert({
    where: { userId_courseId: { userId: req.user.id, courseId: course.id } },
    update: { rating: data.rating, comment: data.comment || null },
    create: {
      userId: req.user.id,
      courseId: course.id,
      rating: data.rating,
      comment: data.comment || null,
    },
  });

  const summary = await getCourseRating(course.id);
  res.status(201).json({ success: true, message: 'Bahoyingiz saqlandi', review, summary });
});

// DELETE /api/courses/:slug/reviews — o'z bahosini o'chirish
const remove = asyncHandler(async (req, res) => {
  const course = await findCourseBySlug(req.params.slug);
  await prisma.review.deleteMany({
    where: { userId: req.user.id, courseId: course.id },
  });
  const summary = await getCourseRating(course.id);
  res.json({ success: true, message: 'Bahoyingiz o\'chirildi', summary });
});

module.exports = { list, upsert, remove };
