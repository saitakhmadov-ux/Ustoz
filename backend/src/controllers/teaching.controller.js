// Ustozning o'quvchilari — ro'yxat va tafsilot.
// Bosh admin (ADMIN) barcha kurslarni, ustoz (INSTRUCTOR) faqat o'ziga
// biriktirilgan kurslarni ko'radi. Egalik `courseScope` orqali cheklanadi.
const { Prisma } = require('@prisma/client');
const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { assertCourseAccess } = require('../utils/courseAccess');
const {
  lessonTasks, accessInfo, accessMonthsFor, buildTaskIndex, progressFor, deriveStatus,
} = require('../utils/learnProgress');

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

// buildTaskIndex / progressFor / deriveStatus — utils/learnProgress.js da
// (Telegram bot hisoboti ham o'sha hisob-kitobdan foydalanadi).

const STATUSES = ['completed', 'expired', 'notStarted', 'inProgress'];

// ILIKE uchun qidiruv matnini qalqonlash — `%` va `_` oddiy belgi sifatida
// qidirilsin (foydalanuvchi kiritgan matn shablonga aylanib ketmasin).
function likePattern(q) {
  return `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

// Yozilishlar ustidagi umumiy SQL: har bir (o'quvchi × kurs) uchun bajarilgan
// vazifalar soni, oxirgi faollik, sertifikat va shundan kelib chiqadigan HOLAT.
//
// Nega xom SQL: holat bo'yicha filtrlash, progress bo'yicha saralash va
// yorliqlardagi sonlar butun ro'yxat ustida hisoblanadi. Buni xotirada qilish
// uchun BARCHA TaskProgress yozuvlarini o'qish kerak edi (o'quvchi × dars ×
// vazifa) — o'quvchilar soni o'sganda bu serverni yiqitadi. Endi hisob bazada
// bajariladi, Node'ga faqat bitta sahifa keladi.
function studentRowsSql({ ids, validKeys, totals, q }) {
  const search = q
    ? Prisma.sql`AND (u."fullName" ILIKE ${likePattern(q)} OR u.email ILIKE ${likePattern(q)})`
    : Prisma.empty;
  // Kurs -> undagi amaldagi vazifalar soni (progress foizi uchun)
  const totalsValues = Prisma.join(
    ids.map((id) => Prisma.sql`(${id}::text, ${totals.get(id) || 0}::int)`),
    ', '
  );
  return Prisma.sql`
    WITH prog AS (
      SELECT tp."userId", s."courseId",
             COUNT(*) FILTER (WHERE tp."taskKey" = ANY(${validKeys})) AS done
      FROM "TaskProgress" tp
      JOIN "Lesson" l ON l.id = tp."lessonId"
      JOIN "Section" s ON s.id = l."sectionId"
      WHERE s."courseId" = ANY(${ids})
      GROUP BY 1, 2
    ),
    course_totals (course_id, total_tasks) AS (VALUES ${totalsValues})
    SELECT e.id,
           e."createdAt" AS enrolled_at,
           u."fullName" AS full_name,
           CASE
             WHEN cert.id IS NOT NULL THEN 'completed'
             WHEN e."expiresAt" IS NOT NULL AND e."expiresAt" <= now() THEN 'expired'
             WHEN COALESCE(p.done, 0) = 0 THEN 'notStarted'
             ELSE 'inProgress'
           END AS status,
           CASE
             WHEN COALESCE(t.total_tasks, 0) = 0 THEN 0
             ELSE ROUND(COALESCE(p.done, 0) * 100.0 / t.total_tasks)
           END AS percent
    FROM "Enrollment" e
    JOIN "User" u ON u.id = e."userId"
    LEFT JOIN "Certificate" cert ON cert."userId" = e."userId" AND cert."courseId" = e."courseId"
    LEFT JOIN prog p ON p."userId" = e."userId" AND p."courseId" = e."courseId"
    LEFT JOIN course_totals t ON t.course_id = e."courseId"
    WHERE e."courseId" = ANY(${ids}) ${search}
  `;
}

// Saralash tartibi — SQL ifodasi. Teng qiymatlarda tartib aniq bo'lishi uchun
// har birida qo'shimcha mezon bor (sahifalar orasida yozuv takrorlanmasin).
const ORDER_SQL = {
  recent: Prisma.sql`r.enrolled_at DESC, r.id DESC`,
  progress: Prisma.sql`r.percent DESC, r.enrolled_at DESC, r.id DESC`,
  name: Prisma.sql`r.full_name ASC, r.id ASC`,
};

// GET /api/admin/teaching/students
// Ustozning kurslariga yozilgan o'quvchilar ro'yxati (yozilish kesimida: o'quvchi × kurs).
// Filtrlar: q (ism/email), courseId, status, sort. Sahifalash: page/limit.
//
// Filtrlash, saralash, sahifalash va yorliq sonlari — bazada. Node'da faqat
// joriy sahifadagi yozilishlar uchun batafsil progress hisoblanadi.
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

  // Kurs mazmuni — vazifa indeksi uchun. Hajmi darslar soniga bog'liq
  // (o'quvchilar soniga emas), shuning uchun o'sishdan xavotir yo'q.
  const lessons = await prisma.lesson.findMany({
    where: { section: { courseId: { in: ids } } },
    select: {
      id: true,
      videoUrl: true,
      content: true,
      materials: { select: { id: true, type: true } },
      questions: { select: { id: true } },
      typingDrill: { select: { id: true } },
      section: { select: { courseId: true } },
    },
  });

  const taskIndex = buildTaskIndex(lessons);
  const lessonCourse = new Map(lessons.map((l) => [l.id, l.section.courseId]));
  const validKeys = [];
  const totals = new Map();
  for (const [courseId, entry] of taskIndex) {
    totals.set(courseId, entry.validKeys.size);
    validKeys.push(...entry.validKeys);
  }

  const base = studentRowsSql({ ids, validKeys, totals, q });
  const statusFilter = status ? Prisma.sql`WHERE r.status = ${status}` : Prisma.empty;

  // Yorliqlar uchun sonlar (holat filtridan OLDIN) va joriy sahifa —
  // ikkalasi ham bazada hisoblanadi
  const [counts, pageIds] = await Promise.all([
    prisma.$queryRaw`SELECT r.status, COUNT(*)::int AS count FROM (${base}) r GROUP BY r.status`,
    prisma.$queryRaw`
      SELECT r.id FROM (${base}) r
      ${statusFilter}
      ORDER BY ${ORDER_SQL[sort]}
      LIMIT ${limit} OFFSET ${skip}
    `,
  ]);

  const summary = { ...emptySummary };
  for (const c of counts) {
    summary[c.status] = c.count;
    summary.all += c.count;
  }
  const total = status ? summary[status] : summary.all;

  const orderedIds = pageIds.map((r) => r.id);
  const enrollments = orderedIds.length
    ? await prisma.enrollment.findMany({
      where: { id: { in: orderedIds } },
      select: {
        id: true,
        userId: true,
        courseId: true,
        createdAt: true,
        expiresAt: true,
        user: { select: { id: true, fullName: true, email: true, avatarUrl: true } },
      },
    })
    : [];
  const enrollmentById = new Map(enrollments.map((e) => [e.id, e]));

  // Batafsil progress faqat SHU SAHIFADAGI o'quvchilar uchun o'qiladi
  const pageUserIds = [...new Set(enrollments.map((e) => e.userId))];
  const pageCourseIds = [...new Set(enrollments.map((e) => e.courseId))];
  const [taskRows, certificates] = pageUserIds.length
    ? await Promise.all([
      prisma.taskProgress.findMany({
        where: {
          userId: { in: pageUserIds },
          lesson: { section: { courseId: { in: pageCourseIds } } },
        },
        select: { userId: true, taskKey: true, completedAt: true, lessonId: true },
      }),
      prisma.certificate.findMany({
        where: { userId: { in: pageUserIds }, courseId: { in: pageCourseIds } },
        select: { id: true, userId: true, courseId: true, serial: true, issuedAt: true },
      }),
    ])
    : [[], []];

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

  // Bazadagi tartibni saqlab qolgan holda qatorlarni tayyorlaymiz
  const students = orderedIds.map((id) => {
    const e = enrollmentById.get(id);
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

  res.json({
    success: true,
    students,
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
        typingDrill: { select: { id: true } },
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
