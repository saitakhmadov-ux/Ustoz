// Yozilish (enrollment) controlleri
const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { lessonTasks, computeExpiry, accessInfo, accessMonthsFor } = require('../utils/learnProgress');
const { notifyEnrolled, notifyInstructorNewStudent } = require('../utils/notify');

// Kurs bo'yicha vazifa-darajali progress hisoblash.
// Har bir dars ichidagi vazifalar (video, matn, materiallar, test) alohida sanaladi.
// Qaytaradi: percent (vazifa bo'yicha), totalTasks/completedTasks, totalLessons/completedLessons.
// `total`/`completed` — eski moslik uchun dars birliklarini bildiradi.
async function computeProgress(userId, courseId) {
  const lessons = await prisma.lesson.findMany({
    where: { section: { courseId } },
    select: {
      id: true,
      videoUrl: true,
      content: true,
      materials: { select: { id: true, type: true } },
      questions: { select: { id: true } },
      // Klaviatura mashqi ham vazifa sanaladi — lessonTasks() shu maydonga qaraydi
      typingDrill: { select: { id: true } },
    },
  });
  const totalLessons = lessons.length;
  if (totalLessons === 0) {
    return { percent: 0, totalTasks: 0, completedTasks: 0, totalLessons: 0, completedLessons: 0, total: 0, completed: 0 };
  }

  // Amaldagi barcha vazifa kalitlari
  const lessonKeyMap = new Map(); // lessonId -> [taskKey]
  const validKeys = new Set();
  for (const l of lessons) {
    const keys = lessonTasks(l).map((t) => t.key);
    lessonKeyMap.set(l.id, keys);
    keys.forEach((k) => validKeys.add(k));
  }
  const totalTasks = validKeys.size;

  // Foydalanuvchi bajargan vazifalar (faqat amaldagi kalitlar hisobga olinadi)
  const rows = await prisma.taskProgress.findMany({
    where: { userId, lesson: { section: { courseId } } },
    select: { taskKey: true },
  });
  const doneKeys = new Set(rows.map((r) => r.taskKey).filter((k) => validKeys.has(k)));
  const completedTasks = doneKeys.size;

  // Tugagan darslar — barcha vazifalari bajarilgan darslar
  let completedLessons = 0;
  for (const keys of lessonKeyMap.values()) {
    if (keys.length > 0 && keys.every((k) => doneKeys.has(k))) completedLessons += 1;
  }

  let percent = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
  // 100% faqat barcha vazifalar bajarilganda; 0% faqat hech narsa qilinmaganda
  if (percent === 100 && completedTasks < totalTasks) percent = 99;
  if (percent === 0 && completedTasks > 0) percent = 1;

  return {
    percent,
    totalTasks,
    completedTasks,
    totalLessons,
    completedLessons,
    total: totalLessons,
    completed: completedLessons,
  };
}

// POST /api/enrollments — kursga yozilish (bepul kurslar uchun to'g'ridan-to'g'ri)
const enroll = asyncHandler(async (req, res) => {
  const { courseId } = req.body;
  if (!courseId) throw ApiError.badRequest('courseId shart');

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course || !course.published) throw ApiError.notFound('Kurs topilmadi');

  const existing = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: req.user.id, courseId } },
  });

  // Allaqachon yozilgan bo'lsa
  if (existing) {
    const { expired } = accessInfo(existing.expiresAt);
    // Muddati tugagan bepul kurs — muddatni yangilaymiz (progress saqlanadi)
    if (expired && (course.isFree || course.price === 0)) {
      const renewed = await prisma.enrollment.update({
        where: { id: existing.id },
        // Yangi muddat — eski ogohlantirish belgisi bekor qilinadi
        data: { expiresAt: computeExpiry(accessMonthsFor(course)), expiryWarnedAt: null },
      });
      return res.json({ success: true, message: 'Foydalanish muddati yangilandi', enrollment: renewed, renewed: true });
    }
    return res.json({ success: true, message: 'Siz allaqachon yozilgansiz', enrollment: existing });
  }

  // Pullik kurs — to'lov orqali yozilishi kerak
  if (!course.isFree && course.price > 0) {
    throw ApiError.badRequest('Bu pullik kurs. Iltimos, avval to\'lovni amalga oshiring');
  }

  const enrollment = await prisma.enrollment.create({
    data: { userId: req.user.id, courseId, expiresAt: computeExpiry(accessMonthsFor(course)) },
  });

  // Bildirishnomalar javobni kutib turmaydi (ichida xatolar ushlanadi)
  notifyEnrolled(req.user.id, course);
  notifyInstructorNewStudent(course.instructorId, req.user.fullName, course);

  res.status(201).json({ success: true, message: 'Kursga muvaffaqiyatli yozildingiz', enrollment });
});

// GET /api/enrollments/my — mening kurslarim (progress + muddat bilan)
const myEnrollments = asyncHandler(async (req, res) => {
  const enrollments = await prisma.enrollment.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      course: {
        select: {
          id: true, title: true, slug: true, thumbnail: true, authorName: true,
          level: true, accessMonths: true, isFree: true, price: true,
          category: { select: { name: true, slug: true } },
        },
      },
    },
  });

  const withProgress = await Promise.all(
    enrollments.map(async (e) => {
      const progress = await computeProgress(req.user.id, e.courseId);
      const access = accessInfo(e.expiresAt, accessMonthsFor(e.course));
      return { ...e, progress, access };
    })
  );

  res.json({ success: true, enrollments: withProgress });
});

module.exports = { enroll, myEnrollments, computeProgress };
