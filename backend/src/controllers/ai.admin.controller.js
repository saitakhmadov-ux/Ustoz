// Admin AI boshqaruvi — Ustoz AI (Gemini) sozlamalari, model ro'yxati, sinov va analitika.
// Barcha yo'nalishlar faqat bosh admin uchun (admin.routes'da adminOnly).
const { GoogleGenAI } = require('@google/genai');
const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const {
  getSetting, setSetting, getAiConfig, AI_CONFIG_KEY, AI_MAX_INSTRUCTIONS,
} = require('../utils/settings');

// Kalitni niqoblab ko'rsatadi (masalan "AQ.A••••••PEmQ")
function maskKey(key) {
  if (!key) return '';
  if (key.length <= 8) return '••••';
  return `${key.slice(0, 4)}••••${key.slice(-4)}`;
}

// GET /api/admin/ai/config — joriy sozlamalar (kalit niqoblangan)
const getConfig = asyncHandler(async (req, res) => {
  const conf = await getAiConfig();
  res.json({
    success: true,
    config: {
      model: conf.model,
      customInstructions: conf.customInstructions,
      enabled: conf.enabled,
      keySet: !!conf.apiKey,
      keyPreview: maskKey(conf.apiKey),
      keySource: conf.keySource, // 'db' | 'env' | 'none'
    },
  });
});

// PUT /api/admin/ai/config — sozlamalarni saqlash
// Body: { model?, customInstructions?, enabled?, apiKey? }
// apiKey bo'sh/berilmagan bo'lsa mavjud kalit saqlanadi (o'zgarmaydi).
const updateConfig = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const existing = (await getSetting(AI_CONFIG_KEY, {})) || {};
  const next = { ...existing };

  if (typeof body.model === 'string' && body.model.trim()) {
    next.model = body.model.trim();
  }
  if (typeof body.customInstructions === 'string') {
    next.customInstructions = body.customInstructions.slice(0, AI_MAX_INSTRUCTIONS);
  }
  if (typeof body.enabled === 'boolean') {
    next.enabled = body.enabled;
  }
  // Yangi kalit faqat bo'sh bo'lmaganda yoziladi (niqob qaytib kelsa e'tiborsiz qoldiramiz)
  if (typeof body.apiKey === 'string') {
    const k = body.apiKey.trim();
    if (k && !k.includes('••')) next.apiKey = k;
  }

  await setSetting(AI_CONFIG_KEY, next);
  const conf = await getAiConfig();
  res.json({
    success: true,
    config: {
      model: conf.model,
      customInstructions: conf.customInstructions,
      enabled: conf.enabled,
      keySet: !!conf.apiKey,
      keyPreview: maskKey(conf.apiKey),
      keySource: conf.keySource,
    },
  });
});

// GET /api/admin/ai/models — joriy kalit uchun mavjud Gemini modellari
const listModels = asyncHandler(async (req, res) => {
  const conf = await getAiConfig();
  if (!conf.apiKey) {
    return res.json({ success: true, models: [], note: 'API kalit yo\'q' });
  }
  try {
    const ai = new GoogleGenAI({ apiKey: conf.apiKey });
    const pager = await ai.models.list();
    const models = [];
    for await (const m of pager) {
      const name = (m.name || '').replace(/^models\//, '');
      const methods = m.supportedActions || m.supportedGenerationMethods || [];
      const ok = !methods.length || methods.includes('generateContent');
      // Faqat matn generatsiya qiladigan gemini/gemma modellari (tts/image/robotics'siz)
      if (ok && /^(gemini|gemma)/.test(name) && !/(tts|image|robotics|computer-use|embedding)/.test(name)) {
        models.push(name);
      }
    }
    res.json({ success: true, models });
  } catch (err) {
    console.error('[AI admin] listModels xato:', err?.message || err);
    throw new ApiError(502, 'Modellar ro\'yxatini olishda xatolik. API kalit to\'g\'riligini tekshiring.');
  }
});

// POST /api/admin/ai/test — joriy sozlamalar bilan sinov so'rovi
const testConfig = asyncHandler(async (req, res) => {
  const conf = await getAiConfig();
  if (!conf.enabled) return res.json({ success: false, error: 'AI o\'chirilgan (enabled=false).' });
  if (!conf.apiKey) return res.json({ success: false, error: 'API kalit yo\'q.' });
  try {
    const ai = new GoogleGenAI({ apiKey: conf.apiKey });
    const r = await ai.models.generateContent({
      model: conf.model,
      contents: [{ role: 'user', parts: [{ text: 'Bir qisqa jumlada o\'zbek tilida salom ber va o\'zingni tanishtir.' }] }],
      config: { maxOutputTokens: 300, thinkingConfig: { thinkingLevel: 'low' } },
    });
    const answer = r.text;
    if (!answer || !answer.trim()) {
      return res.json({ success: false, error: 'Model bo\'sh javob qaytardi (byudjet yoki model muammosi).' });
    }
    res.json({ success: true, model: conf.model, answer });
  } catch (err) {
    res.json({ success: false, error: (err?.message || String(err)).slice(0, 400) });
  }
});

// Oddiy kalit-so'z chastotasi (ko'p so'raladigan mavzular uchun). Stop-so'zlarni chiqarib tashlaydi.
const STOP = new Set([
  'nima','qanday','uchun','bilan','yoki','ham','bir','bu','va','ni','ga','da','dan','men','sen',
  'kod','kodim','xato','xatolik','tushuntiring','ayting','bering','qilib','qiladi','boladi','bolsa',
  'the','and','for','you','this','that','how','what','why','can','not','are','was','with','javob',
  'ustoz','kurs','dars','iltimos','mumkin','kerak','misol','ber','menga','shu','yordam',
]);
function topKeywords(questions, limit = 20) {
  const freq = new Map();
  for (const q of questions) {
    const words = (q || '')
      .toLowerCase()
      .replace(/[^a-z0-9а-яёʼ'`Ѐ-ӿ\s]/gi, ' ')
      .split(/\s+/);
    for (const w of words) {
      const word = w.replace(/['`ʼ]/g, '');
      if (word.length < 3 || STOP.has(word) || /^\d+$/.test(word)) continue;
      freq.set(word, (freq.get(word) || 0) + 1);
    }
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word, count]) => ({ word, count }));
}

// GET /api/admin/ai/analytics — foydalanish analitikasi
const analytics = asyncHandler(async (req, res) => {
  const now = new Date();
  const d7 = new Date(now.getTime() - 7 * 864e5);
  const d30 = new Date(now.getTime() - 30 * 864e5);
  const d14 = new Date(now.getTime() - 14 * 864e5);

  const [total, last7, last30, uniqueUsersRows, withCode, withError, helpfulYes, helpfulNo, byCourseRaw, recent] =
    await Promise.all([
      prisma.aiUsage.count(),
      prisma.aiUsage.count({ where: { createdAt: { gte: d7 } } }),
      prisma.aiUsage.count({ where: { createdAt: { gte: d30 } } }),
      prisma.aiUsage.findMany({ distinct: ['userId'], select: { userId: true } }),
      prisma.aiUsage.count({ where: { hasCode: true } }),
      prisma.aiUsage.count({ where: { hasError: true } }),
      prisma.aiUsage.count({ where: { helpful: true } }),
      prisma.aiUsage.count({ where: { helpful: false } }),
      prisma.aiUsage.groupBy({ by: ['courseId'], _count: { _all: true } }),
      prisma.aiUsage.findMany({
        orderBy: { createdAt: 'desc' },
        take: 400,
        select: { question: true, createdAt: true, hasCode: true, hasError: true },
      }),
    ]);

  // Kurslar bo'yicha — nomlarini biriktiramiz, top 8
  const courseIds = byCourseRaw.map((r) => r.courseId).filter(Boolean);
  const courses = courseIds.length
    ? await prisma.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, title: true, slug: true } })
    : [];
  const courseMap = Object.fromEntries(courses.map((c) => [c.id, c]));
  const byCourse = byCourseRaw
    .map((r) => ({
      courseId: r.courseId,
      title: r.courseId ? (courseMap[r.courseId]?.title || 'Nomsiz kurs') : 'Kursdan tashqari',
      count: r._count._all,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // Kunlik trend (oxirgi 14 kun)
  const dayRows = await prisma.aiUsage.findMany({
    where: { createdAt: { gte: d14 } },
    select: { createdAt: true },
  });
  const dayMap = {};
  for (let i = 0; i < 14; i++) {
    const dt = new Date(now.getTime() - (13 - i) * 864e5);
    dayMap[dt.toISOString().slice(0, 10)] = 0;
  }
  for (const r of dayRows) {
    const key = r.createdAt.toISOString().slice(0, 10);
    if (key in dayMap) dayMap[key]++;
  }
  const byDay = Object.entries(dayMap).map(([date, count]) => ({ date, count }));

  const rated = helpfulYes + helpfulNo;
  const helpfulRate = rated > 0 ? Math.round((helpfulYes / rated) * 100) : null;

  res.json({
    success: true,
    analytics: {
      total,
      last7,
      last30,
      uniqueUsers: uniqueUsersRows.length,
      withCode,
      withError,
      helpfulYes,
      helpfulNo,
      helpfulRate, // % (rated ichida) yoki null
      byCourse,
      byDay,
      keywords: topKeywords(recent.map((r) => r.question)),
      recentSample: recent.slice(0, 12).map((r) => ({
        question: r.question,
        createdAt: r.createdAt,
        hasCode: r.hasCode,
        hasError: r.hasError,
      })),
    },
  });
});

module.exports = { getConfig, updateConfig, listModels, testConfig, analytics };
