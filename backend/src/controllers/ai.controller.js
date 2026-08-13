// AI Ustoz mentori — Gemini API orqali kurs-doirasidagi yordamchi (sayt tomoni).
// Faqat yozilgan (va muddati tugamagan) foydalanuvchi so'raydi; javob kurs mavzusiga qulflangan.
// Sozlamalar (kalit/model/ko'rsatma) DB'dan (admin panel) yoki .env'dan olinadi.
//
// Gemini bilan ishlash mantiqi utils/aiMentor.js da — Telegram boti ham o'sha
// tizim ko'rsatmasi va so'rov qoidalaridan foydalanadi.
const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { getAccess } = require('./learn.controller');
const { getAiConfig } = require('../utils/settings');
const {
  MAX_MESSAGE, MAX_CODE, buildSystemPrompt, buildContents, generateAnswer,
} = require('../utils/aiMentor');

// POST /api/learn/:slug/mentor — kurs mentoriga savol
const askMentor = asyncHandler(async (req, res) => {
  const conf = await getAiConfig();

  if (!conf.enabled) {
    const e = ApiError.forbidden('AI Ustoz hozircha o\'chirilgan.');
    e.code = 'AI_DISABLED';
    throw e;
  }

  const { message, lessonId, history, code, errorText } = req.body || {};
  if (!message || typeof message !== 'string' || !message.trim()) {
    throw ApiError.badRequest('Savol matni bo\'sh bo\'lmasligi kerak');
  }

  // Kurs + kirish huquqi (kurs-qulf: yozilgan va muddati tugamagan bo'lishi shart)
  const course = await prisma.course.findUnique({
    where: { slug: req.params.slug },
    include: {
      category: { select: { name: true } },
      sections: {
        orderBy: { order: 'asc' },
        select: {
          title: true,
          lessons: { orderBy: { order: 'asc' }, select: { id: true, title: true, content: true } },
        },
      },
    },
  });
  if (!course) throw ApiError.notFound('Kurs topilmadi');
  await getAccess(req.user, course); // ruxsat bo'lmasa 403 (NOT_ENROLLED / ACCESS_EXPIRED) tashlaydi

  // Joriy darsni topamiz (kontekst uchun)
  let currentLesson = null;
  if (lessonId) {
    for (const s of course.sections) {
      const l = s.lessons.find((x) => x.id === lessonId);
      if (l) { currentLesson = l; break; }
    }
  }

  // Foydalanuvchi xabari — savol + (ixtiyoriy) kod/xato playground'dan
  const hasCode = !!(code && typeof code === 'string' && code.trim());
  const hasError = !!(errorText && typeof errorText === 'string' && errorText.trim());
  let userText = message.slice(0, MAX_MESSAGE);
  if (hasCode) userText += `\n\nMening kodim:\n\`\`\`javascript\n${code.slice(0, MAX_CODE)}\n\`\`\``;
  if (hasError) userText += `\n\nKonsoldagi xato:\n\`\`\`\n${errorText.slice(0, 2000)}\n\`\`\``;

  const systemInstruction = buildSystemPrompt(course, currentLesson, conf.customInstructions, 'web');
  const contents = buildContents(history, userText);
  const answer = await generateAnswer({ conf, systemInstruction, contents });

  // Foydalanishni analitika uchun jurnalga yozamiz (xato bo'lsa ham javob buzilmasin)
  let usageId = null;
  try {
    const usage = await prisma.aiUsage.create({
      data: {
        userId: req.user.id,
        courseId: course.id,
        lessonId: currentLesson?.id || null,
        question: message.slice(0, 1000),
        hasCode,
        hasError,
      },
      select: { id: true },
    });
    usageId = usage.id;
  } catch (e) {
    console.error('[AI mentor] AiUsage yozishda xato:', e?.message || e);
  }

  res.json({ success: true, answer, usageId });
});

// POST /api/ai/feedback — javob foydali bo'ldimi (👍/👎)
const submitFeedback = asyncHandler(async (req, res) => {
  const { usageId, helpful } = req.body || {};
  if (!usageId || typeof helpful !== 'boolean') {
    throw ApiError.badRequest('usageId va helpful (true/false) kerak');
  }
  // Faqat o'zining yozuviga fikr bildira oladi
  const usage = await prisma.aiUsage.findUnique({ where: { id: usageId }, select: { userId: true } });
  if (!usage || usage.userId !== req.user.id) {
    throw ApiError.notFound('Yozuv topilmadi');
  }
  await prisma.aiUsage.update({ where: { id: usageId }, data: { helpful } });
  res.json({ success: true });
});

module.exports = { askMentor, submitFeedback };
