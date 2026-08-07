// Reyting hisoblash yordamchilari.
// Kurs reytingi = foydalanuvchi baholari o'rtachasi.
// Kategoriya reytingi = ichidagi (nashr etilgan) kurslar o'rtacha reytinglarining o'rtachasi.
const prisma = require('../config/prisma');

function round1(n) {
  return Math.round((n || 0) * 10) / 10;
}

// Kurslar massiviga rating maydonini qo'shadi: { average, count }
async function attachRatingsToCourses(courses) {
  const ids = courses.map((c) => c.id);
  if (ids.length === 0) return courses;
  const grouped = await prisma.review.groupBy({
    by: ['courseId'],
    where: { courseId: { in: ids } },
    _avg: { rating: true },
    _count: { rating: true },
  });
  const map = {};
  for (const g of grouped) {
    map[g.courseId] = { average: round1(g._avg.rating), count: g._count.rating };
  }
  for (const c of courses) c.rating = map[c.id] || { average: 0, count: 0 };
  return courses;
}

// Bitta kurs reytingi: { average, count }
async function getCourseRating(courseId) {
  const agg = await prisma.review.aggregate({
    where: { courseId },
    _avg: { rating: true },
    _count: { rating: true },
  });
  return { average: round1(agg._avg.rating), count: agg._count.rating };
}

// Yulduzlar taqsimoti { 1..5: soni }
async function getRatingDistribution(courseId) {
  const grouped = await prisma.review.groupBy({
    by: ['rating'],
    where: { courseId },
    _count: { rating: true },
  });
  const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const g of grouped) dist[g.rating] = g._count.rating;
  return dist;
}

// Kategoriyalar bo'yicha reyting xaritasi:
// { categoryId: { average, ratedCourses } }
async function categoryRatingMap(categoryIds) {
  if (categoryIds.length === 0) return {};
  const courses = await prisma.course.findMany({
    where: { categoryId: { in: categoryIds }, published: true },
    select: { id: true, categoryId: true },
  });
  const courseIds = courses.map((c) => c.id);
  const grouped = courseIds.length
    ? await prisma.review.groupBy({
        by: ['courseId'],
        where: { courseId: { in: courseIds } },
        _avg: { rating: true },
      })
    : [];
  const courseAvg = {};
  for (const g of grouped) courseAvg[g.courseId] = g._avg.rating || 0;

  const byCat = {};
  for (const c of courses) {
    const avg = courseAvg[c.id];
    if (avg === undefined) continue; // bahosi yo'q kurs hisobga olinmaydi
    (byCat[c.categoryId] = byCat[c.categoryId] || []).push(avg);
  }

  const map = {};
  for (const cid of categoryIds) {
    const arr = byCat[cid] || [];
    map[cid] = arr.length
      ? { average: round1(arr.reduce((a, b) => a + b, 0) / arr.length), ratedCourses: arr.length }
      : { average: 0, ratedCourses: 0 };
  }
  return map;
}

module.exports = {
  round1,
  attachRatingsToCourses,
  getCourseRating,
  getRatingDistribution,
  categoryRatingMap,
};
