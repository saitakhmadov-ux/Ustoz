// Bosh sahifa uchun ommaviy ma'lumotlar — jonli statistika va tanlangan sharhlar
const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { round1 } = require('../utils/rating');

// GET /api/home/stats — jonli ko'rsatkichlar (marketing raqamlari o'rniga haqiqiy)
const stats = asyncHandler(async (req, res) => {
  const [courses, categories, enrolledUsers, ratingAgg] = await Promise.all([
    prisma.course.count({ where: { published: true } }),
    prisma.category.count(),
    prisma.enrollment.findMany({ distinct: ['userId'], select: { userId: true } }),
    prisma.review.aggregate({ _avg: { rating: true }, _count: { rating: true } }),
  ]);

  res.json({
    success: true,
    stats: {
      courses,
      categories,
      students: enrolledUsers.length,
      avgRating: round1(ratingAgg._avg.rating),
      reviewCount: ratingAgg._count.rating,
    },
  });
});

// GET /api/home/reviews — tanlangan ijobiy sharhlar (izohli, 4+ yulduz)
const featuredReviews = asyncHandler(async (req, res) => {
  const limit = Math.min(12, Math.max(1, parseInt(req.query.limit || '6', 10)));
  const reviews = await prisma.review.findMany({
    where: { rating: { gte: 4 }, comment: { not: null } },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      user: { select: { fullName: true, avatarUrl: true } },
      course: { select: { title: true, slug: true } },
    },
  });
  // Bo'sh izohlarni chetlab o'tamiz (comment != null bo'lsa ham bo'sh satr bo'lishi mumkin)
  const filtered = reviews.filter((r) => r.comment && r.comment.trim().length > 0);
  res.json({ success: true, reviews: filtered });
});

module.exports = { stats, featuredReviews };
