// Erkin klaviatura mashqi (Monkeytype uslubidagi vaqtli test).
//
// Kursdan tashqarida ishlaydi: progressga ta'sir qilmaydi, sertifikat bermaydi —
// faqat shaxsiy rekord uchun saqlanadi (TypingAttempt.lessonId = null).
//
// Matnni SERVER tuzadi va o'zida eslab qoladi: natija shu matn bo'yicha
// qaytadan hisoblanadi, ya'ni brauzerdan kelgan songa ishonilmaydi.
const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { gradeAttempt } = require('../utils/typing');
const { randomWords, wordsForDuration } = require('../utils/typingWords');

// Faol mashqlar: userId -> { text, startedAt, durationSec }
const sessions = new Map();
const SESSION_TTL_MS = 30 * 60 * 1000;

function remember(userId, data) {
  const now = Date.now();
  for (const [k, v] of sessions) {
    if (now - v.startedAt > SESSION_TTL_MS) sessions.delete(k);
  }
  sessions.set(userId, { ...data, startedAt: now });
}

// Ruxsat etilgan variantlar — mijoz ixtiyoriy son yubora olmasin.
// Eng kichik variant ham mashq maydonini to'ldirishi kerak (40 ta so'z ≈ 265
// belgi = keng ekranda ham uch qator), aks holda maydon yarim bo'sh turadi.
const TIMES = [15, 30, 60, 120];
const COUNTS = [40, 60, 100, 200];

// GET /api/typing/practice?mode=time&value=30  (yoki mode=words&value=25)
const startPractice = asyncHandler(async (req, res) => {
  const mode = req.query.mode === 'words' ? 'words' : 'time';
  const value = Number(req.query.value);

  let text;
  let durationSec = null;
  if (mode === 'time') {
    durationSec = TIMES.includes(value) ? value : 30;
    text = wordsForDuration(durationSec);
  } else {
    const count = COUNTS.includes(value) ? value : 25;
    text = randomWords(count);
  }

  remember(req.user.id, { text, durationSec });
  res.json({
    success: true, mode, text, durationSec, times: TIMES, counts: COUNTS,
  });
});

// POST /api/typing/practice — natijani yuborish
// body: { typed, durationMs }
const submitPractice = asyncHandler(async (req, res) => {
  const { typed, durationMs } = req.body || {};
  if (typeof typed !== 'string') throw ApiError.badRequest('typed matn bo\'lishi kerak');

  const session = sessions.get(req.user.id);
  if (!session) throw ApiError.badRequest('Mashq topilmadi — qaytadan boshlang');

  const graded = gradeAttempt({
    expected: session.text,
    typed,
    durationMs,
    serverMs: Date.now() - session.startedAt,
    // Erkin mashqda o'tish sharti yo'q — faqat ko'rsatkich
    timedMs: session.durationSec ? session.durationSec * 1000 : null,
  });
  if (!graded.ok) {
    const messages = {
      empty: 'Hech narsa yozilmadi.',
      duration: 'Mashq vaqti noto\'g\'ri — qaytadan boshlang.',
      impossible: 'Natija ishonarli emas — mashqni qaytadan bajaring.',
    };
    throw ApiError.badRequest(messages[graded.reason] || 'Natijani qabul qilib bo\'lmadi');
  }

  sessions.delete(req.user.id);
  const r = graded.result;

  await prisma.typingAttempt.create({
    data: {
      userId: req.user.id,
      lessonId: null,
      wpm: r.wpm,
      accuracy: r.accuracy,
      chars: r.chars,
      errors: r.errors,
      durationMs: r.durationMs,
      passed: false, // erkin mashqda "o'tish" tushunchasi yo'q
    },
  });

  const best = await bestOf(req.user.id);
  res.json({ success: true, result: r, best });
});

// Erkin mashqdagi eng yaxshi natija (tezlik bo'yicha)
async function bestOf(userId) {
  return prisma.typingAttempt.findFirst({
    where: { userId, lessonId: null },
    orderBy: [{ wpm: 'desc' }, { accuracy: 'desc' }],
    select: { wpm: true, accuracy: true, createdAt: true },
  });
}

// GET /api/typing/records — shaxsiy rekord va so'nggi urinishlar
const records = asyncHandler(async (req, res) => {
  const [best, recent] = await Promise.all([
    bestOf(req.user.id),
    prisma.typingAttempt.findMany({
      where: { userId: req.user.id, lessonId: null },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        wpm: true, accuracy: true, durationMs: true, createdAt: true,
      },
    }),
  ]);
  res.json({ success: true, best, recent });
});

module.exports = { startPractice, submitPractice, records };
