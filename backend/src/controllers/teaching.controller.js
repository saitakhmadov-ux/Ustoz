// Ustozning o'quvchilari — ro'yxat va tafsilot.
// Bosh admin (ADMIN) barcha kurslarni, ustoz (INSTRUCTOR) faqat o'ziga
// biriktirilgan kurslarni ko'radi. Egalik `courseScope` orqali cheklanadi.
const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { assertCourseAccess } = require('../utils/courseAccess');
const { lessonTasks, accessInfo, accessMonthsFor } = require('../utils/learnProgress');

// Foydalanuvchi ko'ra oladigan kurslar filtri (prisma `where`).
function courseScope(user) {
  return user.role === 'INSTRUCTOR' ? { instructorId: user.id } : {};
}

// Sahifalash parametrlari
function pageParams(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  return { page, limit, skip: (page - 1) * limit };
}

// Kurs bo'yicha vazifa indeksi: darslardan amaldagi taskKey'larni yig'adi.
// Qaytaradi: Map(courseId -> { validKeys:Set, lessons:[{id, keys}] })
function buildTaskIndex(lessons) {
  const index = new Map();
  for (const l of lessons) {
    const courseId = l.section.courseId;
    if (!index.has(courseId)) index.set(courseId, { validKeys: new Set(), lessons: [] });
    const entry = index.get(courseId);
    const keys = lessonTasks(l).map((t) => t.key);
    keys.forEach((k) => entry.validKeys.add(k));
    entry.lessons.push({ id: l.id, keys });
  }
  return index;
}

// (userId, courseId) juftligi uchun progressni xotirada hisoblaydi.
// doneByUser: Map(userId -> Set(taskKey)) — faqat shu kurs doirasidagi kalitlar.
function progressFor(entry, doneKeys) {
  const totalTasks = entry ? entry.validKeys.size : 0;
  const totalLessons = entry ? entry.lessons.length : 0;
  if (!entry || totalTasks === 0) {
    return { percent: 0, totalTasks: 0, completedTasks: 0, totalLessons, completedLessons: 0 };
  }
  let completedTasks = 0;
  for (const k of doneKeys) if (entry.validKeys.has(k)) completedTasks += 1;
  const completedLessons = entry.lessons.filter(
    (l) => l.keys.length > 0 && l.keys.every((k) => doneKeys.has(k))
  ).length;
  return {
    percent: Math.round((completedTasks / totalTasks) * 100),
    totalTasks,
    completedTasks,
    totalLessons,
    completedLessons,
  };
}

// Yozilish holati. Ustuvorlik: tugatgan → muddati tugagan → boshlamagan → jarayonda.
function deriveStatus({ hasCertificate, expired, completedTasks }) {
  if (hasCertificate) return 'completed';
  if (expired) return 'expired';
  if (completedTasks === 0) return 'notStarted';
  return 'inProgress';
}

const STATUSES = ['completed', 'expired', 'notStarted', 'inProgress'];

// GET /api/admin/teaching/students
// Ustozning kurslariga yozilgan o'quvchilar ro'yxati (yozilish kesimida: o'quvchi × kurs).
// Filtrlar: q (ism/email), courseId, status, sort. Sahifalash: page/limit.
//
// Ma'lumot hajmi seed darajasida bo'lgani uchun (teachingStats bilan bir xil yondashuv)
// yozilishlar to'liq o'qiladi va filtrlash/saralash xotirada bajariladi.
const listStudents = asyncHandler(async (req, res) => {
  const { page, limit, skip } = pageParams(req.query);
  const q = (req.query.q || '').trim().toLowerCase();
  const status = STATUSES.includes(req.query.status) ? req.query.status : null;
  const sort = ['recent', 'progress', 'name'].includes(req.query.sort) ? req.query.sort : 'recent';

  // Kurs filtri berilgan bo'lsa — egalikni tekshiramiz (ustoz begona kursni so'ramasin)
  if (req.query.courseId) await assertCourseAccess(req.user, req.query.courseId);

  const courses = await prisma.course.findMany({
    where: courseScope(req.user),
    orderBy: { createdAt: 'desc' },
    select: { id: true, title: true, slug: true, level: true, accessMonths: true },
  });
  const courseById = new Map(courses.map((c) => [c.id, c]));
  const scopeIds = courses.map((c) => c.id);
  // So'ralgan kurs (yoki barcha biriktirilgan kurslar)
  const ids = req.query.courseId ? [req.query.courseId] : scopeIds;

  const emptySummary = { all: 0, completed: 0, inProgress: 0, notStarted: 0, expired: 0 };
  if (ids.length === 0) {
    return res.json({
      success: true,
      students: [],
      courses,
      summary: emptySummary,
      pagination: { page: 1, limit, total: 0, pages: 1 },
    });
  }

  const [enrollments, lessons, taskRows, certificates] = await Promise.all([
    prisma.enrollment.findMany({
      where: { courseId: { in: ids } },
      select: {
        id: true,
        userId: true,
        courseId: true,
        createdAt: true,
        expiresAt: true,
        user: { select: { id: true, fullName: true, email: true, avatarUrl: true } },
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
      select: { userId: true, taskKey: true, completedAt: true, lessonId: true },
    }),
    prisma.certificate.findMany({
      where: { courseId: { in: ids } },
      select: { id: true, userId: true, courseId: true, serial: true, issuedAt: true },
    }),
  ]);

  const taskIndex = buildTaskIndex(lessons);
  const lessonCourse = new Map(lessons.map((l) => [l.id, l.section.courseId]));

  // (userId:courseId) -> bajarilgan kalitlar to'plami va oxirgi faollik vaqti
  const doneBy = new Map();
  const lastActivity = new Map();
  for (const r of taskRows) {
    const courseId = lessonCourse.get(r.lessonId);
    if (!courseId) continue;
    const key = `${r.userId}:${courseId}`;
    if (!doneBy.has(key)) doneBy.set(key, new Set());
    doneBy.get(key).add(r.taskKey);
    const prev = lastActivity.get(key);
    if (!prev || r.completedAt > prev) lastActivity.set(key, r.completedAt);
  }

  const certBy = new Map(certificates.map((c) => [`${c.userId}:${c.courseId}`, c]));

  // Har bir yozilish uchun qator tayyorlaymiz
  let rows = enrollments.map((e) => {
    const key = `${e.userId}:${e.courseId}`;
    const done = doneBy.get(key) || new Set();
    const course = courseById.get(e.courseId);
    const progress = progressFor(taskIndex.get(e.courseId), done);
    const access = accessInfo(e.expiresAt, course ? accessMonthsFor(course) : null);
    const certificate = certBy.get(key) || null;
    return {
      enrollmentId: e.id,
      user: e.user,
      course: course
        ? { id: course.id, title: course.title, slug: course.slug }
        : { id: e.courseId, title: '—', slug: '' },
      enrolledAt: e.createdAt,
      lastActivityAt: lastActivity.get(key) || null,
      progress,
      certificate,
      access,
      status: deriveStatus({
        hasCertificate: !!certificate,
        expired: access.expired,
        completedTasks: progress.completedTasks,
      }),
    };
  });

  // Qidiruv (ism yoki email)
  if (q) {
    rows = rows.filter(
      (r) => r.user.fullName.toLowerCase().includes(q) || r.user.email.toLowerCase().includes(q)
    );
  }

  // Holat kesimidagi sonlar — status filtridan OLDIN hisoblanadi (yorliqlar uchun)
  const summary = { ...emptySummary, all: rows.length };
  for (const r of rows) summary[r.status] += 1;

  if (status) rows = rows.filter((r) => r.status === status);

  rows.sort((a, b) => {
    if (sort === 'progress') return b.progress.percent - a.progress.percent;
    if (sort === 'name') return a.user.fullName.localeCompare(b.user.fullName, 'uz');
    return new Date(b.enrolledAt) - new Date(a.enrolledAt);
  });

  const total = rows.length;
  res.json({
    success: true,
    students: rows.slice(skip, skip + limit),
    courses,
    summary,
    pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
  });
});

// GET /api/admin/teaching/students/:id
// Bitta o'quvchi — faqat ustozga biriktirilgan kurslar kesimida.
// Begona kurslardagi yozilishlari, to'lovlari va sharhlari ko'rinmaydi.
const getStudentDetail = asyncHandler(async (req, res) => {
  const student = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: { id: true, fullName: true, email: true, avatarUrl: true, bio: true, createdAt: true },
  });
  if (!student) throw ApiError.notFound('O\'quvchi topilmadi');

  const courses = await prisma.course.findMany({
    where: courseScope(req.user),
    select: { id: true, title: true, slug: true, level: true, accessMonths: true },
  });
  const courseById = new Map(courses.map((c) => [c.id, c]));
  const ids = courses.map((c) => c.id);

  const enrollments = ids.length
    ? await prisma.enrollment.findMany({
      where: { userId: student.id, courseId: { in: ids } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, courseId: true, createdAt: true, expiresAt: true },
    })
    : [];

  // O'quvchi ustozning birorta kursiga ham yozilmagan bo'lsa — ko'rsatmaymiz
  if (enrollments.length === 0) {
    throw ApiError.forbidden('Bu o\'quvchi sizning kurslaringizga yozilmagan');
  }

  const enrolledIds = enrollments.map((e) => e.courseId);

  const [lessons, taskRows, attempts, certificates, reviews] = await Promise.all([
    prisma.lesson.findMany({
      where: { section: { courseId: { in: enrolledIds } } },
      orderBy: [{ section: { order: 'asc' } }, { order: 'asc' }],
      select: {
        id: true,
        title: true,
        order: true,
        videoUrl: true,
        content: true,
        materials: { select: { id: true, type: true } },
        questions: { select: { id: true } },
        section: { select: { id: true, title: true, order: true, courseId: true } },
      },
    }),
    prisma.taskProgress.findMany({
      where: { userId: student.id, lesson: { section: { courseId: { in: enrolledIds } } } },
      select: { taskKey: true, completedAt: true, lessonId: true },
    }),
    prisma.quizAttempt.findMany({
      where: { userId: student.id, lesson: { section: { courseId: { in: enrolledIds } } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        correct: true,
        total: true,
        score: true,
        passed: true,
        createdAt: true,
        lesson: { select: { id: true, title: true, section: { select: { courseId: true } } } },
      },
    }),
    prisma.certificate.findMany({
      where: { userId: student.id, courseId: { in: enrolledIds } },
      select: { id: true, courseId: true, serial: true, issuedAt: true },
    }),
    prisma.review.findMany({
      where: { userId: student.id, courseId: { in: enrolledIds } },
      select: { id: true, courseId: true, rating: true, comment: true, createdAt: true },
    }),
  ]);

  const taskIndex = buildTaskIndex(lessons);
  const doneKeys = new Set(taskRows.map((r) => r.taskKey));
  const doneAt = new Map(taskRows.map((r) => [r.taskKey, r.completedAt]));
  const certBy = new Map(certificates.map((c) => [c.courseId, c]));
  const reviewBy = new Map(reviews.map((r) => [r.courseId, r]));

  // Kurs bo'yicha bo'lim/dars kesimida bajarilish xaritasi
  const lessonsByCourse = new Map();
  for (const l of lessons) {
    const cid = l.section.courseId;
    if (!lessonsByCourse.has(cid)) lessonsByCourse.set(cid, []);
    const tasks = lessonTasks(l).map((t) => ({
      key: t.key,
      type: t.type,
      label: t.label,
      done: doneKeys.has(t.key),
      completedAt: doneAt.get(t.key) || null,
    }));
    lessonsByCourse.get(cid).push({
      id: l.id,
      title: l.title,
      sectionId: l.section.id,
      sectionTitle: l.section.title,
      tasks,
      done: tasks.length > 0 && tasks.every((t) => t.done),
    });
  }

  const items = enrollments.map((e) => {
    const course = courseById.get(e.courseId);
    const progress = progressFor(taskIndex.get(e.courseId), doneKeys);
    const access = accessInfo(e.expiresAt, course ? accessMonthsFor(course) : null);
    const certificate = certBy.get(e.courseId) || null;
    const courseLessons = lessonsByCourse.get(e.courseId) || [];
    const lastActivityAt = taskRows
      .filter((r) => courseLessons.some((l) => l.id === r.lessonId))
      .reduce((max, r) => (!max || r.completedAt > max ? r.completedAt : max), null);
    return {
      enrollmentId: e.id,
      course: { id: course.id, title: course.title, slug: course.slug, level: course.level },
      enrolledAt: e.createdAt,
      lastActivityAt,
      progress,
      access,
      certificate,
      review: reviewBy.get(e.courseId) || null,
      lessons: courseLessons,
      attempts: attempts
        .filter((a) => a.lesson.section.courseId === e.courseId)
        .map((a) => ({
          id: a.id,
          lessonId: a.lesson.id,
          lessonTitle: a.lesson.title,
          correct: a.correct,
          total: a.total,
          score: a.score,
          passed: a.passed,
          createdAt: a.createdAt,
        })),
      status: deriveStatus({
        hasCertificate: !!certificate,
        expired: access.expired,
        completedTasks: progress.completedTasks,
      }),
    };
  });

  res.json({ success: true, student, enrollments: items });
});

module.exports = { listStudents, getStudentDetail };
