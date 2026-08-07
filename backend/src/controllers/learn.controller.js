// O'quv jarayoni controlleri — dars kontenti, vazifa progressi, test
const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { computeProgress } = require('./enrollment.controller');
const { issueCertificateIfComplete } = require('./certificate.controller');
const {
  lessonTasks, accessInfo, accessMonthsFor,
  quizRequiredBank, isPureTestLesson, quizCooldownInfo, pickRandom,
} = require('../utils/learnProgress');

// Foydalanuvchining kursga kirish huquqi + muddatini tekshirish.
// Qaytaradi: { staff, enrollment }. staff=true bo'lsa muddatsiz (admin/kurs ustozi).
async function getAccess(user, course) {
  if (user.role === 'ADMIN') return { staff: true, enrollment: null };
  if (user.role === 'INSTRUCTOR' && course.instructorId === user.id) {
    return { staff: true, enrollment: null };
  }
  const enr = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: user.id, courseId: course.id } },
  });
  if (!enr) {
    const e = ApiError.forbidden('Bu kursga kirish uchun avval yoziling');
    e.code = 'NOT_ENROLLED';
    throw e;
  }
  const info = accessInfo(enr.expiresAt);
  if (info.expired) {
    const e = ApiError.forbidden('Kursdan foydalanish muddati tugagan. Davom etish uchun qayta yoziling.');
    e.code = 'ACCESS_EXPIRED';
    throw e;
  }
  return { staff: false, enrollment: enr };
}

// Kursdagi darslarni tartib bo'yicha tekis ro'yxatda yuklaydi (vazifa metama'lumoti bilan).
async function loadOrderedLessons(courseId) {
  const sections = await prisma.section.findMany({
    where: { courseId },
    orderBy: { order: 'asc' },
    select: {
      lessons: {
        orderBy: { order: 'asc' },
        select: {
          id: true,
          videoUrl: true,
          content: true,
          materials: { select: { id: true, type: true } },
          questions: { select: { id: true } },
        },
      },
    },
  });
  return sections.flatMap((s) => s.lessons);
}

// Foydalanuvchining kurs bo'yicha bajarilgan vazifa kalitlari to'plami.
async function userDoneKeys(userId, courseId) {
  const rows = await prisma.taskProgress.findMany({
    where: { userId, lesson: { section: { courseId } } },
    select: { taskKey: true },
  });
  return new Set(rows.map((r) => r.taskKey));
}

// Dars to'liq bajarilganmi (barcha vazifalari doneKeys ichida)
function lessonIsComplete(lesson, doneKeys) {
  const keys = lessonTasks(lesson).map((t) => t.key);
  return keys.length > 0 && keys.every((k) => doneKeys.has(k));
}

// LessonProgress yozuvini vazifalar holatiga moslashtiradi (sertifikat/statistika uchun saqlanadi).
async function syncLessonProgress(userId, lesson, doneKeys) {
  const complete = lessonIsComplete(lesson, doneKeys);
  if (complete) {
    await prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId, lessonId: lesson.id } },
      update: { completed: true, completedAt: new Date() },
      create: { userId, lessonId: lesson.id, completed: true, completedAt: new Date() },
    });
  } else {
    await prisma.lessonProgress.updateMany({
      where: { userId, lessonId: lesson.id, completed: true },
      data: { completed: false, completedAt: null },
    });
  }
  return complete;
}

// Berilgan darsning ketma-ketlik bo'yicha ochilgan (unlocked) ekanligini tekshiradi.
// staff uchun har doim ochiq. Aks holda oldingi dars to'liq tugagan bo'lishi kerak.
function isUnlocked(orderedLessons, doneKeys, lessonId, staff) {
  if (staff) return true;
  const idx = orderedLessons.findIndex((l) => l.id === lessonId);
  if (idx <= 0) return true; // birinchi dars doim ochiq
  const prev = orderedLessons[idx - 1];
  return lessonIsComplete(prev, doneKeys);
}

// GET /api/learn/:slug — to'liq kurs kontenti (yozilgan foydalanuvchi uchun)
const getCourseContent = asyncHandler(async (req, res) => {
  const course = await prisma.course.findUnique({
    where: { slug: req.params.slug },
    include: {
      category: { select: { name: true, slug: true } },
      sections: {
        orderBy: { order: 'asc' },
        include: {
          lessons: {
            orderBy: { order: 'asc' },
            include: {
              // Test savollari — MATN va VARIANTLAR bu yerda YUBORILMAYDI (ko'chirishga
              // qarshi + yodlashga qarshi). Faqat baza hajmini bilish uchun id olamiz.
              questions: { select: { id: true } },
              materials: { orderBy: { createdAt: 'asc' } },
            },
          },
        },
      },
    },
  });
  if (!course) throw ApiError.notFound('Kurs topilmadi');

  const { staff, enrollment } = await getAccess(req.user, course);

  // Foydalanuvchining bajargan vazifalari
  const doneKeys = await userDoneKeys(req.user.id, course.id);
  const orderedLessons = course.sections.flatMap((s) => s.lessons);

  // Test kuldownini hisoblash uchun — bu kursdagi eng oxirgi urinishlar (dars bo'yicha)
  const attempts = await prisma.quizAttempt.findMany({
    where: { userId: req.user.id, lesson: { section: { courseId: course.id } } },
    orderBy: { createdAt: 'desc' },
    select: { lessonId: true, passed: true, score: true, createdAt: true },
  });
  const latestAttempt = new Map();
  for (const a of attempts) {
    if (!latestAttempt.has(a.lessonId)) latestAttempt.set(a.lessonId, a);
  }

  const sections = course.sections.map((s) => ({
    ...s,
    lessons: s.lessons.map((l) => {
      const tasks = lessonTasks(l).map((t) => ({ ...t, done: doneKeys.has(t.key) }));
      const doneCount = tasks.filter((t) => t.done).length;
      const hasQuiz = l.questions.length > 0;
      // Test meta (savol matnisiz) — foydalanuvchi test-darsni ko'radi, lekin savollar
      // faqat "Testni boshlash" bosilganda alohida endpointdan tortiladi.
      let quiz = null;
      if (hasQuiz) {
        const total = l.questions.length;
        const pure = isPureTestLesson(l); // sof test-dars (faqat savol)
        const required = pure ? quizRequiredBank(l.quizDraw) : total;
        const available = pure ? total >= required : total > 0;
        const draw = pure ? Math.min(l.quizDraw, total) : total;
        const last = latestAttempt.get(l.id) || null;
        // Kuldown faqat oxirgi urinish YIQILGAN bo'lsa (o'tgan bo'lsa tozalanadi)
        const cooldown = last && !last.passed
          ? quizCooldownInfo(last.createdAt, l.quizCooldownHours)
          : { active: false, remainingMs: 0, until: null };
        quiz = {
          total,
          draw,
          required,
          pure,
          available,
          timePerQ: l.quizTimePerQ,
          passPercent: l.quizPassPercent,
          cooldownHours: l.quizCooldownHours,
          passed: doneKeys.has(`quiz:${l.id}`),
          lastScore: last ? last.score : null,
          cooldown,
        };
      }
      // Video qulfi: darsda video bo'lsa va u ko'rilmagan bo'lsa, qolgan
      // materiallar (matn/PDF/test) bloklanadi. Staff (admin/ustoz) uchun qo'llanmaydi.
      const videoTask = tasks.find((t) => t.type === 'VIDEO');
      const videoGate = !staff && !!videoTask && !videoTask.done;
      // Savol identifikatorlarini ham chiqarmaymiz
      const { questions, ...rest } = l;
      return {
        ...rest,
        tasks,
        tasksTotal: tasks.length,
        tasksDone: doneCount,
        completed: tasks.length > 0 && doneCount === tasks.length,
        hasQuiz,
        quiz,
        videoGate,
        locked: !isUnlocked(orderedLessons, doneKeys, l.id, staff),
      };
    }),
  }));

  const progress = await computeProgress(req.user.id, course.id);
  const access = staff
    ? { staff: true, expiresAt: null, expired: false, daysLeft: null, ratioLeft: null }
    : { staff: false, ...accessInfo(enrollment.expiresAt, accessMonthsFor(course)) };

  res.json({ success: true, course: { ...course, sections }, progress, access });
});

// Vazifani bajarilgan deb belgilash uchun umumiy oqim (write path).
// Muddat + qulf tekshiradi, TaskProgress upsert qiladi, LessonProgress'ni moslaydi,
// progress + sertifikatni qaytaradi.
async function applyTaskCompletion(user, lesson, course, taskKeys) {
  const { staff } = await getAccess(user, course);

  const orderedLessons = await loadOrderedLessons(course.id);
  const doneKeys = await userDoneKeys(user.id, course.id);

  if (!isUnlocked(orderedLessons, doneKeys, lesson.id, staff)) {
    throw ApiError.forbidden('Bu dars hali ochilmagan. Avval oldingi darsni yakunlang.');
  }

  // Video qulfi: darsda video bo'lsa, uni ko'rmasdan boshqa vazifalarni belgilab bo'lmaydi.
  // (Video vazifasining o'zini belgilash — pleer to'liq ko'rilgach — bundan mustasno.)
  const videoKey = `video:${lesson.id}`;
  if (!staff && lesson.videoUrl && !doneKeys.has(videoKey) && !taskKeys.includes(videoKey)) {
    const e = ApiError.forbidden('Avval videoni oxirigacha ko\'ring — keyin material/test ochiladi.');
    e.code = 'VIDEO_REQUIRED';
    throw e;
  }

  // Kalitlarni yozamiz (idempotent)
  for (const key of taskKeys) {
    await prisma.taskProgress.upsert({
      where: { userId_taskKey: { userId: user.id, taskKey: key } },
      update: {},
      create: { userId: user.id, taskKey: key, lessonId: lesson.id },
    });
    doneKeys.add(key);
  }

  // Dars holatini moslash (orderedLessons ichidan bu darsni topamiz — materiallar/savollar bilan)
  const freshLesson = orderedLessons.find((l) => l.id === lesson.id) || lesson;
  const lessonCompleted = await syncLessonProgress(user.id, freshLesson, doneKeys);

  const progress = await computeProgress(user.id, course.id);
  let certificate = null;
  if (progress.percent === 100) {
    certificate = await issueCertificateIfComplete(user.id, course.id);
  }
  return { progress, lessonCompleted, certificate };
}

// POST /api/lessons/:lessonId/task — bitta vazifani bajarilgan deb belgilash
// body: { taskKey }
const completeTask = asyncHandler(async (req, res) => {
  const { taskKey } = req.body;
  if (!taskKey || typeof taskKey !== 'string') throw ApiError.badRequest('taskKey shart');

  const lesson = await prisma.lesson.findUnique({
    where: { id: req.params.lessonId },
    include: {
      section: { include: { course: true } },
      materials: { select: { id: true, type: true } },
      questions: { select: { id: true } },
    },
  });
  if (!lesson) throw ApiError.notFound('Dars topilmadi');

  const validKeys = new Set(lessonTasks(lesson).map((t) => t.key));
  if (!validKeys.has(taskKey)) throw ApiError.badRequest('Bunday vazifa topilmadi');
  if (taskKey.startsWith('quiz:')) {
    throw ApiError.badRequest('Test vazifasi faqat testdan o\'tilganda belgilanadi');
  }

  const result = await applyTaskCompletion(req.user, lesson, lesson.section.course, [taskKey]);
  res.json({ success: true, ...result });
});

// POST /api/lessons/:lessonId/complete — darsning barcha (testdan tashqari) vazifalarini belgilash
// Komponentsiz ("done") darslar va qulaylik tugmasi uchun.
const completeLesson = asyncHandler(async (req, res) => {
  const lesson = await prisma.lesson.findUnique({
    where: { id: req.params.lessonId },
    include: {
      section: { include: { course: true } },
      materials: { select: { id: true, type: true } },
      questions: { select: { id: true } },
    },
  });
  if (!lesson) throw ApiError.notFound('Dars topilmadi');

  // Testdan va videodan tashqari barcha vazifa kalitlari.
  // Video faqat pleerda to'liq ko'rilgach belgilanadi (ommaviy belgilashдан chiqarilgan).
  const keys = lessonTasks(lesson).map((t) => t.key)
    .filter((k) => !k.startsWith('quiz:') && !k.startsWith('video:'));
  const result = await applyTaskCompletion(req.user, lesson, lesson.section.course, keys);

  const message = result.lessonCompleted
    ? 'Dars tugallandi'
    : 'Belgilandi. Darsni yakunlash uchun testdan ham o\'ting.';
  res.json({ success: true, message, ...result });
});

// Test-darsni to'liq yuklaydi (savollar + kurs + sozlamalar). Kirish, qulf, kuldown
// tekshiruvlarini bajaradi. Qaytaradi: { lesson, course, staff, latestFailed }.
async function loadQuizContext(user, lessonId) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      section: { include: { course: true } },
      questions: true,
      materials: { select: { id: true } },
    },
  });
  if (!lesson) throw ApiError.notFound('Dars topilmadi');
  if (lesson.questions.length === 0) throw ApiError.badRequest('Bu darsda test yo\'q');

  const course = lesson.section.course;
  const { staff } = await getAccess(user, course);

  // Qulf — ochilmagan darsda test yechib bo'lmaydi
  const orderedLessons = await loadOrderedLessons(course.id);
  const preKeys = await userDoneKeys(user.id, course.id);
  if (!isUnlocked(orderedLessons, preKeys, lesson.id, staff)) {
    throw ApiError.forbidden('Bu dars hali ochilmagan. Avval oldingi darsni yakunlang.');
  }

  // Video qulfi: darsda video bo'lsa, uni to'liq ko'rmasdan testга kirib bo'lmaydi.
  if (!staff && lesson.videoUrl && !preKeys.has(`video:${lesson.id}`)) {
    const e = ApiError.forbidden('Avval videoni oxirigacha ko\'ring — keyin test ochiladi.');
    e.code = 'VIDEO_REQUIRED';
    throw e;
  }

  // Sof test-dars uchun baza hajmi yetarlimi (yodlashga qarshi — kamida 2×draw).
  // Aralash darsdagi kichik testda barcha savol beriladi (eski uslub buzilmaydi).
  const pure = isPureTestLesson(lesson);
  const required = quizRequiredBank(lesson.quizDraw);
  if (pure && lesson.questions.length < required) {
    const e = ApiError.badRequest(`Test hali tayyor emas (bazada kamida ${required} ta savol bo'lishi kerak).`);
    e.code = 'QUIZ_NOT_READY';
    throw e;
  }
  const effectiveDraw = pure ? lesson.quizDraw : lesson.questions.length;

  // Kuldown — oxirgi urinish yiqilgan bo'lsa, muddat tugamaguncha bloklanadi
  const last = await prisma.quizAttempt.findFirst({
    where: { userId: user.id, lessonId: lesson.id },
    orderBy: { createdAt: 'desc' },
  });
  if (last && !last.passed) {
    const cd = quizCooldownInfo(last.createdAt, lesson.quizCooldownHours);
    if (cd.active) {
      const e = ApiError.forbidden('Test qayta topshirish muddati hali kelmadi. Avvalgi materiallarni qayta ko\'ring.');
      e.code = 'QUIZ_COOLDOWN';
      e.cooldown = cd;
      throw e;
    }
  }

  return { lesson, course, staff, orderedLessons, effectiveDraw };
}

// POST /api/lessons/:lessonId/quiz/start — test urinishini boshlash.
// Bazadan tasodifiy `quizDraw` ta savol tortadi va to'g'ri javobsiz qaytaradi.
const startQuiz = asyncHandler(async (req, res) => {
  const { lesson, effectiveDraw } = await loadQuizContext(req.user, req.params.lessonId);

  const drawn = pickRandom(lesson.questions, effectiveDraw);
  const questions = drawn.map((q) => ({
    id: q.id,
    question: q.question,
    imageUrl: q.imageUrl || null,
    options: q.options,
  }));

  res.json({
    success: true,
    quiz: {
      questions,
      draw: questions.length,
      timePerQ: lesson.quizTimePerQ,
      passPercent: lesson.quizPassPercent,
      cooldownHours: lesson.quizCooldownHours,
    },
  });
});

// POST /api/lessons/:lessonId/quiz — test javoblarini tekshirish
// body: { answers: { <questionId>: selectedIndex | null } } — startQuiz bergan savollar bo'yicha.
const submitQuiz = asyncHandler(async (req, res) => {
  const { answers } = req.body;
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
    throw ApiError.badRequest('answers obyekt bo\'lishi kerak: { questionId: tanlov }');
  }

  const { lesson, course, orderedLessons } = await loadQuizContext(req.user, req.params.lessonId);

  // Faqat shu darsga tegishli savollarni hisobga olamiz
  const byId = new Map(lesson.questions.map((q) => [q.id, q]));
  const submittedIds = Object.keys(answers).filter((id) => byId.has(id));
  if (submittedIds.length === 0) throw ApiError.badRequest('Javoblar topilmadi');

  let correct = 0;
  for (const id of submittedIds) {
    const q = byId.get(id);
    if (answers[id] === q.correctIndex) correct += 1;
  }

  const total = submittedIds.length;
  const score = Math.round((correct / total) * 100);
  const passed = score >= lesson.quizPassPercent;

  // Urinishni yozamiz (kuldown va tarix uchun)
  await prisma.quizAttempt.create({
    data: { userId: req.user.id, lessonId: lesson.id, correct, total, score, passed },
  });

  let progress = null;
  let certificate = null;
  let lessonCompleted = false;
  let cooldown = null;

  if (passed) {
    // Test vazifasini bajarilgan deb belgilaymiz
    const quizKey = `quiz:${lesson.id}`;
    await prisma.taskProgress.upsert({
      where: { userId_taskKey: { userId: req.user.id, taskKey: quizKey } },
      update: {},
      create: { userId: req.user.id, taskKey: quizKey, lessonId: lesson.id },
    });
    const doneKeys = await userDoneKeys(req.user.id, course.id);
    const freshLesson = orderedLessons.find((l) => l.id === lesson.id) || lesson;
    lessonCompleted = await syncLessonProgress(req.user.id, freshLesson, doneKeys);
    progress = await computeProgress(req.user.id, course.id);
    if (progress.percent === 100) {
      certificate = await issueCertificateIfComplete(req.user.id, course.id);
    }
  } else {
    // Yiqildi — kuldown boshlanadi
    cooldown = quizCooldownInfo(new Date(), lesson.quizCooldownHours);
  }

  // MUHIM: to'g'ri javoblarni oshkor qilmaymiz (yodlashga qarshi) — faqat natija.
  res.json({
    success: true,
    score,
    correct,
    total,
    passed,
    passPercent: lesson.quizPassPercent,
    cooldownHours: lesson.quizCooldownHours,
    cooldown,
    progress,
    lessonCompleted,
    certificate,
  });
});

module.exports = { getCourseContent, completeTask, completeLesson, startQuiz, submitQuiz };
