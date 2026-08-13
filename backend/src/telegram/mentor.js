// AI Ustoz — Telegram bot ichidagi kurs mentori.
//
// Saytdagi dars sahifasidagi mentor bilan bir xil qoidalar (utils/aiMentor.js):
// javob faqat o'zbekcha va faqat kurs mavzusi doirasida, foydalanuvchi matni
// ko'rsatma emas — ma'lumot sifatida qabul qilinadi.
//
// Kirish huquqi: faqat kursga YOZILGAN va muddati tugamagan foydalanuvchi
// so'rashi mumkin — har savolda qayta tekshiriladi (suhbat davomida muddat
// tugab qolishi mumkin).
//
// Suhbat holati xotirada saqlanadi (Map): server qayta yuklansa suhbat
// yangidan boshlanadi. Bu ataylab shunday — savol-javob tarixi uchun alohida
// jadval ochish shart emas, analitika esa AiUsage ga yoziladi.
const prisma = require('../config/prisma');
const { getAiConfig } = require('../utils/settings');
const {
  MAX_MESSAGE, MAX_HISTORY, buildSystemPrompt, buildContents, generateAnswer,
} = require('../utils/aiMentor');
const { accessInfo, accessMonthsFor } = require('../utils/learnProgress');
const { esc, siteUrl, mdToTelegramChunks } = require('./format');
const { mainKeyboard } = require('./keyboard');

const SESSION_TTL = 30 * 60 * 1000; // 30 daqiqa jimlikdan keyin suhbat yopiladi
const RATE_LIMIT = 20; // bir foydalanuvchi uchun soatiga savollar soni
const RATE_WINDOW = 60 * 60 * 1000;

// chatId -> { userId, courseId, courseTitle, courseSlug, systemInstruction, history, updatedAt, busy }
const sessions = new Map();
// userId -> { count, resetAt }
const rates = new Map();

// Muddati o'tgan suhbatlarni tozalaymiz (har murojaatda — alohida taymer kerak emas)
function pruneSessions() {
  const now = Date.now();
  for (const [chatId, s] of sessions) {
    if (now - s.updatedAt > SESSION_TTL) sessions.delete(chatId);
  }
}

function getSession(chatId) {
  pruneSessions();
  return sessions.get(String(chatId)) || null;
}

function endSession(chatId) {
  return sessions.delete(String(chatId));
}

// Soatlik chegara. Qaytaradi: { ok, resetInMin }
function checkRate(userId) {
  const now = Date.now();
  // Xarita cheksiz o'smasin — vaqti o'tgan yozuvlarni vaqti-vaqti bilan tozalaymiz
  if (rates.size > 500) {
    for (const [id, r] of rates) if (now > r.resetAt) rates.delete(id);
  }
  const row = rates.get(userId);
  if (!row || now > row.resetAt) {
    rates.set(userId, { count: 1, resetAt: now + RATE_WINDOW });
    return { ok: true };
  }
  if (row.count >= RATE_LIMIT) {
    return { ok: false, resetInMin: Math.max(1, Math.ceil((row.resetAt - now) / 60000)) };
  }
  row.count += 1;
  return { ok: true };
}

// Foydalanuvchining ochiq (muddati tugamagan) kurslari
async function activeCourses(userId) {
  const enrollments = await prisma.enrollment.findMany({
    where: { userId },
    select: {
      expiresAt: true,
      course: {
        select: {
          id: true, title: true, slug: true, level: true, accessMonths: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  return enrollments
    .filter((e) => !accessInfo(e.expiresAt, accessMonthsFor(e.course)).expired)
    .map((e) => e.course);
}

// Kurs bo'yicha tizim ko'rsatmasini tuzadi (tarkib: bo'limlar va darslar ro'yxati)
async function buildCourseInstruction(courseId, conf) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      category: { select: { name: true } },
      sections: {
        orderBy: { order: 'asc' },
        select: {
          title: true,
          lessons: { orderBy: { order: 'asc' }, select: { id: true, title: true } },
        },
      },
    },
  });
  if (!course) return null;
  return {
    course,
    systemInstruction: buildSystemPrompt(course, null, conf.customInstructions, 'telegram'),
  };
}

// Suhbatni boshlaydi va tayyor xabarni qaytaradi
async function startSession(ctx, user, courseId) {
  const conf = await getAiConfig();
  const built = await buildCourseInstruction(courseId, conf);
  if (!built) return ctx.reply('Kurs topilmadi.');

  sessions.set(String(ctx.chat.id), {
    userId: user.id,
    courseId: built.course.id,
    courseTitle: built.course.title,
    courseSlug: built.course.slug,
    systemInstruction: built.systemInstruction,
    history: [],
    updatedAt: Date.now(),
    busy: false,
  });

  return ctx.reply(
    `🤖 <b>AI Ustoz</b> — "${esc(built.course.title)}"\n\n`
    + 'Savolingizni shu yerga yozing: tushunmagan mavzu, kod xatosi yoki mashq.\n'
    + 'Kodni yuborsangiz — uch qo\'shtirnoq ichida yuboring.\n\n'
    + 'Boshqa kursga o\'tish — 🤖 AI Ustoz tugmasi.',
    { parse_mode: 'HTML', ...mainKeyboard(user, { inChat: true }) },
  );
}

// /ustoz — kurs tanlash yoki darhol boshlash
async function ustozCommand(ctx, user) {
  const conf = await getAiConfig();
  if (!conf.enabled) {
    return ctx.reply('AI Ustoz hozircha o\'chirilgan.');
  }
  if (!conf.apiKey) {
    return ctx.reply('AI Ustoz hozircha sozlanmagan. Admin API kalitni kiritishi kerak.');
  }

  const courses = await activeCourses(user.id);
  if (!courses.length) {
    return ctx.reply(
      'AI Ustoz kursga yozilgan o\'quvchilar uchun.\n\n'
      + `Kurslar: ${siteUrl()}/courses`,
    );
  }
  if (courses.length === 1) {
    return startSession(ctx, user, courses[0].id);
  }

  return ctx.reply('Qaysi kurs bo\'yicha savolingiz bor?', {
    reply_markup: {
      inline_keyboard: courses
        .slice(0, 20)
        .map((c) => [{ text: c.title.slice(0, 60), callback_data: `ustoz:${c.id}` }]),
    },
  });
}

// Suhbat yopilganda odatdagi tugmalar panelini qaytaramiz
async function basePanel(userId) {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  return mainKeyboard(u || { role: 'USER' });
}

// Savolni AI ga uzatadi va javobni bo'laklab yuboradi
async function askQuestion(ctx, session, text) {
  const conf = await getAiConfig();
  if (!conf.enabled) {
    endSession(ctx.chat.id);
    return ctx.reply('AI Ustoz hozircha o\'chirilgan.', await basePanel(session.userId));
  }

  // Kirish huquqi har savolda qayta tekshiriladi — muddat suhbat davomida tugashi mumkin
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: session.userId, courseId: session.courseId } },
    select: { expiresAt: true, course: { select: { level: true, accessMonths: true } } },
  });
  if (!enrollment) {
    endSession(ctx.chat.id);
    return ctx.reply('Bu kursga yozilmagansiz. Suhbat yakunlandi.', await basePanel(session.userId));
  }
  if (accessInfo(enrollment.expiresAt, accessMonthsFor(enrollment.course)).expired) {
    endSession(ctx.chat.id);
    return ctx.reply(
      `"${esc(session.courseTitle)}" kursiga kirish muddati tugagan.\n\n`
      + `Muddatni uzaytirish: ${siteUrl()}/courses/${session.courseSlug}`,
      { parse_mode: 'HTML', ...(await basePanel(session.userId)) },
    );
  }

  const rate = checkRate(session.userId);
  if (!rate.ok) {
    return ctx.reply(
      `Soatiga ${RATE_LIMIT} tadan ko'p savol berib bo'lmaydi. `
      + `${rate.resetInMin} daqiqadan so'ng qayta urinib ko'ring.`,
    );
  }

  session.busy = true;
  session.updatedAt = Date.now();

  const question = text.slice(0, MAX_MESSAGE);
  try {
    await ctx.sendChatAction('typing');
    const contents = buildContents(session.history, question);
    const answer = await generateAnswer({
      conf,
      systemInstruction: session.systemInstruction,
      contents,
      // Sayt mentori bilan bir xil byudjet: "fikrlash" tokenlari ham shu hisobdan
      // ketadi, kamaytirilsa javob kod blokining o'rtasida uzilib qoladi.
      // Javobning qisqaligi tizim ko'rsatmasidagi "KANAL: TELEGRAM" bloki bilan
      // ta'minlanadi, uzun javob esa bo'laklab yuboriladi.
      maxOutputTokens: 2000,
    });

    // Tarix — oxirgi MAX_HISTORY almashinuv
    session.history.push({ role: 'user', text: question });
    session.history.push({ role: 'model', text: answer });
    if (session.history.length > MAX_HISTORY * 2) {
      session.history = session.history.slice(-MAX_HISTORY * 2);
    }
    session.updatedAt = Date.now();

    for (const chunk of mdToTelegramChunks(answer)) {
      // eslint-disable-next-line no-await-in-loop
      await ctx.reply(chunk, { parse_mode: 'HTML', link_preview_options: { is_disabled: true } });
    }

    // Analitika (admin AI paneli shu yozuvlardan o'qiydi). Xato bo'lsa javob buzilmasin.
    try {
      await prisma.aiUsage.create({
        data: {
          userId: session.userId,
          courseId: session.courseId,
          question: question.slice(0, 1000),
          hasCode: /```/.test(text),
          hasError: false,
        },
      });
    } catch (e) {
      console.error('[AI bot] AiUsage yozishda xato:', e?.message || e);
    }
  } catch (err) {
    // generateAnswer ApiError qaytaradi — xabari allaqachon o'zbekcha
    const msg = err?.statusCode ? err.message : 'AI Ustozdan javob olishda xatolik. Birozdan so\'ng urinib ko\'ring.';
    await ctx.reply(msg);
  } finally {
    session.busy = false;
  }
  return undefined;
}

// Suhbatni yakunlash — "/tugat" ham, "✖️ Suhbatni tugatish" tugmasi ham
async function tugatCommand(ctx, user = null) {
  const session = getSession(ctx.chat.id);
  const panel = session ? await basePanel(session.userId) : (user ? mainKeyboard(user) : {});
  if (endSession(ctx.chat.id)) {
    return ctx.reply('Suhbat yakunlandi. Yana savol bo\'lsa — 🤖 AI Ustoz.', panel);
  }
  return ctx.reply('Ochiq suhbat yo\'q. Boshlash uchun — 🤖 AI Ustoz.', panel);
}

// Oddiy matn — ochiq suhbat bo'lsa AI ga uzatiladi.
// Qaytaradi: true (biz ishladik) / false (suhbat yo'q, boshqa ishlov bersin).
async function handleText(ctx, text) {
  const session = getSession(ctx.chat.id);
  if (!session) return false;
  if (session.busy) {
    await ctx.reply('Oldingi savolingiz ustida ishlayapman, biroz kuting…');
    return true;
  }
  await askQuestion(ctx, session, text);
  return true;
}

function registerMentor(bot, findUser) {
  bot.command('ustoz', async (ctx) => {
    const user = await findUser(ctx);
    if (!user) return undefined;
    return ustozCommand(ctx, user);
  });

  bot.command('tugat', (ctx) => tugatCommand(ctx));

  // Kurs tanlash tugmasi
  bot.action(/^ustoz:(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const user = await findUser(ctx);
    if (!user) return undefined;

    const courseId = ctx.match[1];
    // Tugma eskirgan bo'lishi mumkin — kirish huquqini qayta tekshiramiz
    const courses = await activeCourses(user.id);
    if (!courses.some((c) => c.id === courseId)) {
      return ctx.reply('Bu kurs sizga ochiq emas. /ustoz — ro\'yxatni yangilash.');
    }
    return startSession(ctx, user, courseId);
  });
}

module.exports = {
  registerMentor, handleText, ustozCommand, tugatCommand, getSession,
};
