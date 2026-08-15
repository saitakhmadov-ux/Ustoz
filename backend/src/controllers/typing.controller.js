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

// ---------- Rekordlar jadvali ----------
//
// Barcha urinishlar hisobga olinadi: erkin mashq ham, kurs darslari ham.
//
// MUHIM: qisqa mashqlarda tezlik sun'iy ravishda yuqori chiqadi (10 ta belgini
// hamma ham tez uradi), shuning uchun jadvalga faqat YETARLI UZUN urinishlar
// kiradi — aks holda birinchi darsni yozgan odam ro'yxat boshiga chiqib qolardi.
const RANK_MIN_CHARS = 100;
const RANK_MIN_MS = 15000;
const RANK_LIMIT = 20;
// Reyting o'rnini aniqlash uchun ko'riladigan maksimal foydalanuvchi soni
const RANK_SCAN = 500;

const rankWhere = {
  chars: { gte: RANK_MIN_CHARS },
  durationMs: { gte: RANK_MIN_MS },
};

// GET /api/typing/leaderboard — eng kuchli natijalar (top 20)
const leaderboard = asyncHandler(async (req, res) => {
  // 1) Har bir foydalanuvchining eng yaxshi tezligi
  const grouped = await prisma.typingAttempt.groupBy({
    by: ['userId'],
    where: rankWhere,
    _max: { wpm: true },
    _count: { _all: true },
    orderBy: { _max: { wpm: 'desc' } },
    take: RANK_SCAN,
  });

  if (grouped.length === 0) {
    return res.json({
      success: true, rows: [], me: null, minChars: RANK_MIN_CHARS,
    });
  }

  const top = grouped.slice(0, RANK_LIMIT);
  const ids = top.map((g) => g.userId);

  // 2) Shu tezlikdagi urinishning tafsilotlari (aniqlik, sana, manba)
  const [attempts, users] = await Promise.all([
    prisma.typingAttempt.findMany({
      where: {
        ...rankWhere,
        OR: top.map((g) => ({ userId: g.userId, wpm: g._max.wpm })),
      },
      select: {
        userId: true, wpm: true, accuracy: true, lessonId: true, createdAt: true,
      },
      orderBy: [{ accuracy: 'desc' }, { createdAt: 'asc' }],
    }),
    prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, fullName: true },
    }),
  ]);

  const bestOfUser = new Map();
  for (const a of attempts) if (!bestOfUser.has(a.userId)) bestOfUser.set(a.userId, a);
  const nameOf = new Map(users.map((u) => [u.id, u.fullName]));

  const rows = top.map((g, i) => {
    const best = bestOfUser.get(g.userId);
    return {
      rank: i + 1,
      userId: g.userId,
      fullName: nameOf.get(g.userId) || 'Foydalanuvchi',
      wpm: g._max.wpm,
      accuracy: best ? best.accuracy : null,
      attempts: g._count._all,
      source: best && best.lessonId ? 'lesson' : 'practice',
      achievedAt: best ? best.createdAt : null,
      isMe: g.userId === req.user.id,
    };
  });

  // 3) Foydalanuvchining o'z o'rni (ro'yxatga kirmagan bo'lsa ham ko'rsatamiz)
  const myIndex = grouped.findIndex((g) => g.userId === req.user.id);
  let me = null;
  if (myIndex >= 0) {
    const mine = grouped[myIndex];
    me = {
      rank: myIndex + 1,
      wpm: mine._max.wpm,
      attempts: mine._count._all,
      inTop: myIndex < RANK_LIMIT,
    };
  }

  return res.json({
    success: true,
    rows,
    me,
    total: grouped.length,
    minChars: RANK_MIN_CHARS,
    minSec: RANK_MIN_MS / 1000,
  });
});

module.exports = {
  startPractice, submitPractice, records, leaderboard,
};
