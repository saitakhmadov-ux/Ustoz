// IELTS Computer Writing mashq moduli (sayt tomoni).
//
// Yo'nalishlar "Klaviaturada tez yozish" kursi ichida joylashgan, shuning
// uchun kirish huquqi mavjud `getAccess` bilan tekshiriladi: faqat kursga
// yozilgan va muddati tugamagan foydalanuvchi ishlata oladi (AI mentor bilan
// bir xil qoida).
//
// IELTS urinishlari kurs progressiga, sertifikatga va klaviatura "Rekordlar"
// jadvaliga TA'SIR QILMAYDI — bu alohida mashq tarixi.
const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { getAccess } = require('./learn.controller');
const { writingStats, copyStats, validDuration } = require('../utils/ielts');
const { pickRandom } = require('../utils/learnProgress');
const { getAiConfig } = require('../utils/settings');
const { generateAnswer } = require('../utils/aiMentor');
const { buildSystemPrompt, buildUserContent, parseEvaluation } = require('../utils/ieltsGrader');

const WRITING_TYPES = ['ACADEMIC_T1', 'GENERAL_T1', 'TASK2'];
const COPY_TYPES = ['TYPING', 'VOCAB'];
const ALL_TYPES = [...WRITING_TYPES, ...COPY_TYPES];
const MAX_TEXT = 20000; // esse uchun yetarli, ammo cheksiz emas

// Kursni topib, foydalanuvchining kirish huquqini tekshiradi
async function assertCourseAccess(user, slug) {
  const course = await prisma.course.findUnique({
    where: { slug },
    select: { id: true, kind: true, instructorId: true },
  });
  if (!course) throw ApiError.notFound('Kurs topilmadi');
  await getAccess(user, course); // yozilmagan/muddati tugagan bo'lsa 403
  return course;
}

// Topshiriqni foydalanuvchiga yuboriladigan ko'rinishga keltiradi
function publicTask(t) {
  return {
    id: t.id,
    code: t.code,
    type: t.type,
    subtype: t.subtype,
    level: t.level,
    title: t.title,
    prompt: t.prompt,
    visual: t.visual,
    chartData: t.chartData,
    imageUrl: t.imageUrl,
    dataSummary: t.dataSummary,
    body: t.body,
    minWords: t.minWords,
    durationSec: t.durationSec,
  };
}

// GET /api/learn/:slug/ielts/task?type=&level=&taskId=
// Tasodifiy (yoki aniq belgilangan) topshiriqni beradi.
const getTask = asyncHandler(async (req, res) => {
  await assertCourseAccess(req.user, req.params.slug);

  const { type, level, taskId } = req.query;
  if (!ALL_TYPES.includes(type)) throw ApiError.badRequest('Topshiriq turi noto\'g\'ri');

  // Aniq topshiriq so'ralgan bo'lsa (foydalanuvchi eskisini qayta ishlashi mumkin)
  if (taskId) {
    const one = await prisma.ieltsTask.findFirst({ where: { id: taskId, type, active: true } });
    if (!one) throw ApiError.notFound('Topshiriq topilmadi');
    return res.json({ success: true, task: publicTask(one) });
  }

  const where = { type, active: true };
  if (type === 'VOCAB' && level) where.level = level;

  const tasks = await prisma.ieltsTask.findMany({ where });
  if (tasks.length === 0) {
    throw ApiError.notFound('Bu tur bo\'yicha topshiriq hali qo\'shilmagan');
  }

  const [task] = pickRandom(tasks, 1);
  return res.json({ success: true, task: publicTask(task), total: tasks.length });
});

// POST /api/learn/:slug/ielts/attempt
// body: { taskId, text, durationMs }
//
// Natijani SERVER hisoblaydi: yozma topshiriqda so'z/belgi, ko'chirishda esa
// matn mashq matni bilan solishtiriladi.
const submitAttempt = asyncHandler(async (req, res) => {
  await assertCourseAccess(req.user, req.params.slug);

  const { taskId, text, durationMs } = req.body || {};
  if (typeof text !== 'string') throw ApiError.badRequest('Matn yuborilmadi');
  if (!taskId) throw ApiError.badRequest('taskId shart');

  const ms = validDuration(durationMs);
  if (!ms) throw ApiError.badRequest('Mashq vaqti noto\'g\'ri — qaytadan boshlang');

  const task = await prisma.ieltsTask.findUnique({ where: { id: taskId } });
  if (!task) throw ApiError.notFound('Topshiriq topilmadi');

  const clean = text.slice(0, MAX_TEXT);
  const isCopy = COPY_TYPES.includes(task.type);

  if (!clean.trim()) throw ApiError.badRequest('Hech narsa yozilmadi');

  const stats = isCopy
    ? copyStats(task.body || '', clean, ms)
    : writingStats(clean, ms, task.minWords);

  const attempt = await prisma.ieltsAttempt.create({
    data: {
      userId: req.user.id,
      taskId: task.id,
      type: task.type,
      // Ko'chirish mashqlarida yozilgan matnni saqlashning ma'nosi yo'q —
      // u mashq matnining nusxasi. Esselar esa to'liq saqlanadi (AI baholash
      // va foydalanuvchining o'z tarixi uchun).
      text: isCopy ? '' : clean,
      words: stats.words,
      chars: stats.chars,
      wpm: stats.wpm,
      accuracy: isCopy ? stats.accuracy : null,
      errors: isCopy ? stats.errors : null,
      correctWords: isCopy ? stats.correctWords : null,
      durationMs: ms,
      minWords: isCopy ? null : (task.minWords ?? null),
      metMinWords: isCopy ? null : (stats.metMinWords ?? null),
    },
  });

  res.status(201).json({
    success: true,
    attempt: {
      id: attempt.id,
      type: attempt.type,
      words: attempt.words,
      chars: attempt.chars,
      wpm: attempt.wpm,
      accuracy: attempt.accuracy,
      errors: attempt.errors,
      correctWords: attempt.correctWords,
      totalWords: isCopy ? stats.totalWords : null,
      durationMs: attempt.durationMs,
      minWords: attempt.minWords,
      metMinWords: attempt.metMinWords,
      createdAt: attempt.createdAt,
    },
    // Esselar uchun AI baholash alohida so'raladi (token sarfi nazorat qilinadi)
    canEvaluate: !isCopy,
  });
});

// GET /api/learn/:slug/ielts/attempts — mening natijalarim tarixi
const myAttempts = asyncHandler(async (req, res) => {
  await assertCourseAccess(req.user, req.params.slug);

  const attempts = await prisma.ieltsAttempt.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
    take: 30,
    select: {
      id: true,
      type: true,
      words: true,
      chars: true,
      wpm: true,
      accuracy: true,
      errors: true,
      correctWords: true,
      durationMs: true,
      minWords: true,
      metMinWords: true,
      aiBand: true,
      aiStatus: true,
      createdAt: true,
      task: { select: { title: true, subtype: true, code: true } },
    },
  });

  res.json({ success: true, attempts });
});

// GET /api/learn/:slug/ielts/attempt/:id — bitta urinish (esse matni va AI tahlili bilan)
const getAttempt = asyncHandler(async (req, res) => {
  await assertCourseAccess(req.user, req.params.slug);

  const attempt = await prisma.ieltsAttempt.findUnique({
    where: { id: req.params.id },
    include: { task: { select: { title: true, subtype: true, prompt: true, type: true } } },
  });
  // Esse — shaxsiy matn: faqat egasi ko'radi
  if (!attempt || attempt.userId !== req.user.id) throw ApiError.notFound('Natija topilmadi');

  res.json({ success: true, attempt });
});

/* ---------------- AI baholash ---------------- */

// Esse baholash qimmat amal — soatlik chegara qo'yamiz (mentordagi kabi).
const EVAL_LIMIT = 10;
const EVAL_WINDOW = 60 * 60 * 1000;
const evalHits = new Map(); // userId -> { count, resetAt }

function checkEvalLimit(userId) {
  const now = Date.now();
  const row = evalHits.get(userId);
  if (!row || row.resetAt <= now) {
    evalHits.set(userId, { count: 1, resetAt: now + EVAL_WINDOW });
    return { ok: true };
  }
  if (row.count >= EVAL_LIMIT) {
    return { ok: false, resetInMin: Math.max(1, Math.ceil((row.resetAt - now) / 60000)) };
  }
  row.count += 1;
  return { ok: true };
}

// POST /api/learn/:slug/ielts/attempt/:id/evaluate
// Esseni IELTS mezonlari bo'yicha baholaydi (Gemini). Natija urinishga
// saqlanadi — takroriy so'rovda qayta hisoblanmaydi (tokenni tejaydi).
const evaluateAttempt = asyncHandler(async (req, res) => {
  const course = await assertCourseAccess(req.user, req.params.slug);

  const attempt = await prisma.ieltsAttempt.findUnique({
    where: { id: req.params.id },
    include: { task: true },
  });
  if (!attempt || attempt.userId !== req.user.id) throw ApiError.notFound('Natija topilmadi');
  if (COPY_TYPES.includes(attempt.type)) {
    throw ApiError.badRequest('Bu mashq turi baholanmaydi');
  }
  if (!attempt.text.trim()) throw ApiError.badRequest('Baholash uchun matn yo\'q');

  // Allaqachon baholangan — saqlanganini qaytaramiz
  if (attempt.aiStatus === 'done' && attempt.aiBand !== null) {
    return res.json({
      success: true,
      evaluation: {
        band: attempt.aiBand,
        summary: attempt.aiFeedback || '',
        criteria: attempt.aiCriteria?.criteria || [],
        fixes: attempt.aiCriteria?.fixes || [],
      },
      cached: true,
    });
  }

  const conf = await getAiConfig();
  if (!conf.enabled) {
    const e = ApiError.forbidden('AI baholash hozircha o\'chirilgan.');
    e.code = 'AI_DISABLED';
    throw e;
  }

  const limit = checkEvalLimit(req.user.id);
  if (!limit.ok) {
    throw new ApiError(429, `Soatiga ${EVAL_LIMIT} tagacha esse baholanadi. `
      + `${limit.resetInMin} daqiqadan keyin qayta urinib ko'ring.`);
  }

  const systemInstruction = buildSystemPrompt(attempt.type);
  const userContent = buildUserContent(attempt.task || {}, attempt);
  // maxOutputTokens 2000 dan pastga tushirilmasin: "fikrlash" tokenlari ham
  // shu byudjetdan ketadi va javob JSON o'rtasida uzilib qoladi.
  const answer = await generateAnswer({
    conf,
    systemInstruction,
    contents: [{ role: 'user', parts: [{ text: userContent }] }],
    maxOutputTokens: 2600,
  });

  const evaluation = parseEvaluation(answer, attempt.type);
  if (!evaluation) {
    await prisma.ieltsAttempt.update({
      where: { id: attempt.id },
      data: { aiStatus: 'failed' },
    });
    throw new ApiError(502, 'Baholash natijasini o\'qib bo\'lmadi. Qaytadan urinib ko\'ring.');
  }

  await prisma.ieltsAttempt.update({
    where: { id: attempt.id },
    data: {
      aiBand: evaluation.band,
      aiFeedback: evaluation.summary,
      aiCriteria: { criteria: evaluation.criteria, fixes: evaluation.fixes },
      aiStatus: 'done',
    },
  });

  // Analitika uchun (admin AI panelida ko'rinadi). Xato bo'lsa ham javob buzilmasin.
  try {
    await prisma.aiUsage.create({
      data: {
        userId: req.user.id,
        courseId: course.id,
        question: `IELTS baholash: ${attempt.task?.title || attempt.type}`.slice(0, 1000),
      },
    });
  } catch (e) {
    console.error('[IELTS] AiUsage yozishda xato:', e?.message || e);
  }

  return res.json({ success: true, evaluation });
});

module.exports = {
  getTask,
  submitAttempt,
  myAttempts,
  getAttempt,
  evaluateAttempt,
  assertCourseAccess,
  WRITING_TYPES,
  COPY_TYPES,
  MAX_TEXT,
};
