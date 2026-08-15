// Telegram bot buyruqlari va tugmalar paneli.
//
// Har bir amal ikki yo'l bilan chaqiriladi: "/buyruq" yozib yoki xabar maydoni
// ostidagi tugmani bosib (keyboard.js). Ikkalasi ham bir xil funksiyaga boradi.
//
// Xavfsizlik qoidasi: bot faqat O'ZI ULANGAN hisobning ma'lumotini ko'rsatadi.
// Parol, to'lov ma'lumoti va tasdiqlash kodlari bu yerda hech qachon
// ko'rsatilmaydi va so'ralmaydi.
const prisma = require('../config/prisma');
const { consumeLinkToken } = require('./link');
const { accessInfo, accessMonthsFor } = require('../utils/learnProgress');
const {
  esc, bar, money, siteUrl, siteIsLinkable, shortDate, chunkLines,
} = require('./format');
const { LABELS, labelCommand, mainKeyboard } = require('./keyboard');
const {
  registerTeacherCommands, isTeacher, maoshCommand, studentsCommand,
} = require('./teacher');
const {
  registerMentor, handleText, ustozCommand, tugatCommand, getSession,
} = require('./mentor');
const { registerOnboarding, welcome } = require('./onboarding');
const { registerPrefs } = require('./prefs');

// computeProgress ataylab shu yerda emas, ishlatilgan joyda yuklanadi:
// controller -> utils/notify -> telegram/bot -> handlers halqasi hosil bo'lmasin
// (yuqorida yuklansa, notify.js bot.js dan sendMessage'ni ololmay qoladi).
const computeProgress = (...args) => require('../controllers/enrollment.controller').computeProgress(...args);

// Yordam matni. Tugmalar asosiy yo'l, buyruqlar esa qo'shimcha imkoniyat.
function help(user) {
  const lines = ['<b>Ustoz bot</b>', ''];

  if (!user) {
    lines.push(
      `${LABELS.catalog} — barcha kurslar va narxlari`,
      `${LABELS.link} — hisobni botga ulash`,
      '',
      'Ulangach kurslaringiz, AI Ustoz va xabarlar shu yerda bo\'ladi.',
    );
  } else {
    lines.push(
      `${LABELS.courses} — kurslarim va progress`,
      `${LABELS.ai} — AI Ustozdan savol so'rash`,
      `${LABELS.certificates} — olingan sertifikatlar va yuklab olish`,
      `${LABELS.catalog} — barcha kurslar va narxlari`,
    );
    if (isTeacher(user)) {
      lines.push(
        `${LABELS.salary} — daromadim va balans`,
        `${LABELS.students} — o'quvchilarim kesimi`,
      );
    }
    lines.push(
      '',
      '<i>Tugmalar xabar maydoni ostida. Xohlasangiz buyruq ham yozsa bo\'ladi:</i>',
      '<code>/kurslar /kurslarim /sertifikatlarim /ustoz'
      + `${isTeacher(user) ? ' /maosh /oquvchilarim' : ''} /sozlamalar /yordam /uzish</code>`,
      '',
      `📊 Tugatilmagan kurslaringiz bo'yicha kuniga bir marta eslatma keladi${
        user.progressPingOff ? ' <b>(hozir o\'chirilgan)</b>' : ''} — /kunlik`,
      '🔔 Qaysi xabarlar kelishini tanlash — /sozlamalar',
    );
  }

  lines.push(
    '',
    '🔒 Bot hech qachon parol yoki tasdiqlash kodi so\'ramaydi.',
    `Sayt: ${siteUrl()}`,
  );
  return lines.join('\n');
}

// Ulangan foydalanuvchini topadi. Topilmasa foydalanuvchiga yo'l ko'rsatadi.
async function findUser(ctx) {
  const chatId = String(ctx.chat?.id || '');
  const user = chatId
    ? await prisma.user.findUnique({ where: { telegramChatId: chatId } })
    : null;
  if (!user) {
    await ctx.reply(
      'Hisobingiz hali ulanmagan.\n\n'
      + `Ulash uchun "${LABELS.link}" tugmasini bosing (yoki /ulash).`,
      mainKeyboard(null),
    );
    return null;
  }
  return user;
}

// Ulanmagan bo'lsa ham javob bera olish uchun — jimgina qidiradi
async function findUserQuiet(ctx) {
  const chatId = String(ctx.chat?.id || '');
  if (!chatId) return null;
  return prisma.user.findUnique({ where: { telegramChatId: chatId } });
}

// Panelni holatga qarab qaytaradi (AI suhbati ochiq bo'lsa — "tugatish" tugmasi bilan)
const panelFor = (ctx, user) => mainKeyboard(user, { inChat: Boolean(getSession(ctx.chat?.id)) });

// Uzun ro'yxatni bir necha xabarga bo'lib yuboradi (4096 belgi chegarasi)
async function replyList(ctx, lines, extra = {}) {
  const chunks = chunkLines(lines);
  for (const chunk of chunks) {
    // eslint-disable-next-line no-await-in-loop
    await ctx.reply(chunk, {
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
      ...extra,
    });
  }
  return undefined;
}

// ---------- Buyruq tanalari (buyruq va tugma uchun umumiy) ----------

async function helpCommand(ctx) {
  const user = await findUserQuiet(ctx);
  return ctx.reply(help(user), { parse_mode: 'HTML', ...panelFor(ctx, user) });
}

// Yozilgan kurslar, progress va kirish muddati
async function coursesCommand(ctx, user) {
  const enrollments = await prisma.enrollment.findMany({
    where: { userId: user.id },
    include: {
      course: {
        select: {
          id: true, title: true, slug: true, level: true, accessMonths: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!enrollments.length) {
    return ctx.reply(
      'Hali birorta kursga yozilmagansiz.\n\n'
      + `Kurslar: ${siteUrl()}/courses`,
    );
  }

  const lines = ['<b>Mening kurslarim</b>', ''];
  for (const e of enrollments) {
    // eslint-disable-next-line no-await-in-loop
    const progress = await computeProgress(user.id, e.courseId);
    const access = accessInfo(e.expiresAt, accessMonthsFor(e.course));

    let muddat = '';
    if (access.expired) muddat = '\n⛔ Kirish muddati tugagan';
    else if (access.daysLeft !== null && access.daysLeft <= 7) muddat = `\n⚠️ ${access.daysLeft} kun qoldi`;

    const url = `${siteUrl()}/learn/${e.course.slug}`;
    lines.push(
      `📘 <b>${esc(e.course.title)}</b>\n`
      + `${bar(progress.percent)}${muddat}\n`
      // Lokal manzilni Telegram havola qilmaydi — <code> bo'lsa nusxalasa bo'ladi
      + (siteIsLinkable() ? `<a href="${url}">▶️ Darsni ochish</a>` : `<code>${esc(url)}</code>`),
      '',
    );
  }

  return replyList(ctx, lines);
}

const LEVEL_LABEL = {
  BEGINNER: 'Boshlang\'ich',
  INTERMEDIATE: 'O\'rta',
  ADVANCED: 'Yuqori',
};

// Barcha ochiq kurslar va narxlari. Hisob ulanmagan bo'lsa ham ko'rsatiladi —
// katalog ochiq ma'lumot. Ulangan bo'lsa, yozilgan kurslari ✅ bilan belgilanadi
// (bir kursni ikki marta sotib olmasin).
async function catalogCommand(ctx, user) {
  const [courses, enrollments] = await Promise.all([
    prisma.course.findMany({
      where: { published: true },
      select: {
        id: true,
        title: true,
        slug: true,
        price: true,
        isFree: true,
        level: true,
        category: { select: { name: true } },
      },
      orderBy: [{ category: { name: 'asc' } }, { price: 'asc' }],
    }),
    user
      ? prisma.enrollment.findMany({ where: { userId: user.id }, select: { courseId: true } })
      : [],
  ]);

  if (!courses.length) {
    return ctx.reply('Hozircha ochiq kurslar yo\'q. Tez orada qo\'shiladi.');
  }

  const mine = new Set(enrollments.map((e) => e.courseId));
  const lines = ['🛒 <b>Kurslar</b>', ''];

  let lastCategory = null;
  for (const c of courses) {
    const category = c.category?.name || 'Boshqa';
    if (category !== lastCategory) {
      lines.push(`<b>— ${esc(category)} —</b>`);
      lastCategory = category;
    }

    const narx = c.isFree || c.price === 0 ? '🆓 Bepul' : `💵 ${money(c.price)} so'm`;
    const belgi = mine.has(c.id) ? ' ✅' : '';
    const url = `${siteUrl()}/courses/${c.slug}`;

    lines.push(
      `📘 <b>${esc(c.title)}</b>${belgi}`,
      `${narx} · ${LEVEL_LABEL[c.level] || c.level}`,
    );
    lines.push(siteIsLinkable() ? `<a href="${url}">Batafsil</a>` : `<code>${esc(url)}</code>`, '');
  }

  lines.push(
    mine.size
      ? '<i>✅ — siz allaqachon yozilgan kurslar.</i>'
      : '<i>Kursga yozilish sayt orqali amalga oshiriladi.</i>',
  );
  if (!user) lines.push('<i>Hisobingizni ulasangiz, progressingiz shu yerda ko\'rinadi — /ulash</i>');

  return replyList(ctx, lines);
}

// Olingan sertifikatlar: kurs, raqam, sana va sahifasiga havola.
// Sertifikat sahifasi (/certificates/<id>) ochiq — havolani ochgan odam
// darhol "chop etish / PDF" tugmasini bosa oladi, qayta kirish shart emas.
async function certificatesCommand(ctx, user) {
  const certificates = await prisma.certificate.findMany({
    where: { userId: user.id },
    orderBy: { issuedAt: 'desc' },
    include: { course: { select: { title: true } } },
  });

  if (!certificates.length) {
    return ctx.reply(
      '🎓 <b>Sertifikatlarim</b>\n\n'
      + 'Hali sertifikat yo\'q. Kursning barcha darslarini yakunlasangiz, '
      + 'sertifikat avtomatik beriladi va shu yerda paydo bo\'ladi.\n\n'
      + `Kurslaringiz: "${LABELS.courses}" tugmasi`,
      { parse_mode: 'HTML' },
    );
  }

  const linkFor = (c) => `${siteUrl()}/certificates/${c.id}`;
  const linkable = siteIsLinkable();
  // Har bir sertifikatga alohida tugma; Telegram ro'yxatni cheksiz uzaytirmasin
  const BUTTON_LIMIT = 10;
  const lines = ['🎓 <b>Mening sertifikatlarim</b>', ''];

  certificates.forEach((c, i) => {
    lines.push(
      `📜 <b>${esc(c.course?.title || '—')}</b>`,
      `Raqam: <code>${esc(c.serial)}</code>`,
      `Berilgan: ${shortDate(c.issuedAt)}`,
    );
    if (!linkable) {
      // Lokal manzil: Telegram uni havola qilmaydi (localhost TLD emas).
      // <code> ichida bersak, ustiga bosilganda hech bo'lmasa nusxalanadi.
      lines.push(`<code>${esc(linkFor(c))}</code>`);
    } else if (i >= BUTTON_LIMIT) {
      // Tugmalar chegarasidan tashqarida qolganlar — matndagi havola bilan
      lines.push(`<a href="${linkFor(c)}">⬇️ Yuklab olish</a>`);
    }
    lines.push('');
  });

  lines.push(
    linkable
      ? '<i>⬇️ tugmasini bosing — sertifikat sahifasi ochiladi va u yerdagi '
        + '"Sertifikatni chop etish / PDF" tugmasi orqali yuklab olasiz.</i>'
      : '<i>Sayt manzili lokal (localhost) bo\'lgani uchun Telegram uni havola '
        + 'qila olmadi — manzil ustiga bosilsa nusxalanadi. Jonli saytda bu '
        + 'yerda bosiladigan ⬇️ tugma bo\'ladi.</i>',
  );

  const extra = { parse_mode: 'HTML', link_preview_options: { is_disabled: true } };
  if (linkable) {
    extra.reply_markup = {
      inline_keyboard: certificates.slice(0, BUTTON_LIMIT).map((c) => [{
        text: `⬇️ ${(c.course?.title || 'Sertifikat').slice(0, 45)}`,
        url: linkFor(c),
      }]),
    };
  }
  return ctx.reply(lines.join('\n'), extra);
}

// Tugma bosilganda ishlaydigan yo'naltirgich
async function runLabel(ctx, cmd) {
  if (cmd === 'help') return helpCommand(ctx);

  // Katalog hisobsiz ham ochiq
  if (cmd === 'catalog') return catalogCommand(ctx, await findUserQuiet(ctx));

  if (cmd === 'link') {
    const linked = await findUserQuiet(ctx);
    if (linked) {
      return ctx.reply('Hisobingiz allaqachon ulangan.', mainKeyboard(linked));
    }
    return welcome(ctx);
  }

  const user = await findUser(ctx); // ulanmagan bo'lsa o'zi yo'l ko'rsatadi
  if (!user) return undefined;

  if (cmd === 'courses') return coursesCommand(ctx, user);
  if (cmd === 'certificates') return certificatesCommand(ctx, user);
  if (cmd === 'ai') return ustozCommand(ctx, user);
  if (cmd === 'endChat') return tugatCommand(ctx, user);
  if (cmd === 'salary') return maoshCommand(ctx, user);
  if (cmd === 'students') return studentsCommand(ctx, user);
  return undefined;
}

function registerHandlers(bot) {
  // /start — ulash havolasi bilan kelsa hisobni bog'laydi
  bot.start(async (ctx) => {
    const token = (ctx.startPayload || '').trim();

    if (token) {
      const res = await consumeLinkToken(token, ctx.chat.id, ctx.from?.username);
      if (res.ok) {
        // Tasdiqlash havolasi bo'lsa — hisob shu daqiqada faollashdi va
        // saytdagi oyna o'zi kirib ketadi; odam nima bo'lganini bilib tursin.
        const intro = res.purpose === 'VERIFY'
          ? `Salom, ${esc(res.user.fullName)}! ✅\n\n`
            + '<b>Hisobingiz tasdiqlandi</b> va botga ulandi.\n'
            + 'Saytdagi oynaga qayting — u yerda avtomatik kirasiz.\n\n'
          : `Salom, ${esc(res.user.fullName)}! ✅\n\n`
            + 'Hisobingiz botga ulandi. Endi kurslaringiz va xabarlaringizni shu yerdan olasiz.\n\n';
        return ctx.reply(intro + help(res.user), {
          parse_mode: 'HTML',
          ...mainKeyboard(res.user),
        });
      }
      const reasons = {
        invalid: 'Havola yaroqsiz yoki muddati tugagan. Saytdan yangi havola oling.',
        used: 'Bu havola allaqachon ishlatilgan. Saytdan yangi havola oling.',
        taken: 'Bu Telegram akkaunt boshqa hisobga ulangan. Avval /uzish buyrug\'ini bering.',
      };
      return ctx.reply(reasons[res.reason] || 'Ulashda xatolik. Qayta urinib ko\'ring.');
    }

    const linked = await findUserQuiet(ctx);
    if (linked) {
      return ctx.reply(
        `Salom, ${esc(linked.fullName)}! 👋\n\n${help(linked)}`,
        { parse_mode: 'HTML', ...panelFor(ctx, linked) },
      );
    }

    // Ulanmagan — botning o'zidan ulash menyusi (onboarding.js)
    return welcome(ctx);
  });

  bot.command('yordam', helpCommand);
  bot.help(helpCommand);

  // /kurslar — katalog (hisob ulanmagan bo'lsa ham ishlaydi)
  bot.command('kurslar', async (ctx) => catalogCommand(ctx, await findUserQuiet(ctx)));

  bot.command('kurslarim', async (ctx) => {
    const user = await findUser(ctx);
    if (!user) return undefined;
    return coursesCommand(ctx, user);
  });

  bot.command('sertifikatlarim', async (ctx) => {
    const user = await findUser(ctx);
    if (!user) return undefined;
    return certificatesCommand(ctx, user);
  });

  // /kunlik — kunlik progress eslatmasini yoqish/o'chirish
  bot.command('kunlik', async (ctx) => {
    const user = await findUser(ctx);
    if (!user) return undefined;

    const off = !user.progressPingOff; // holatni teskarisiga o'giramiz
    await prisma.user.update({ where: { id: user.id }, data: { progressPingOff: off } });
    return ctx.reply(
      off
        ? 'Kunlik eslatma o\'chirildi. Qayta yoqish uchun yana /kunlik yozing.'
        : 'Kunlik eslatma yoqildi. Tugatilmagan kurslaringiz bo\'yicha kuniga bir marta '
          + 'progress va qolgan kunlar haqida xabar keladi.',
    );
  });

  // /uzish — bog'lanishni bekor qilish
  bot.command('uzish', async (ctx) => {
    const chatId = String(ctx.chat.id);
    const user = await prisma.user.findUnique({ where: { telegramChatId: chatId } });
    if (!user) {
      return ctx.reply('Bu Telegram akkaunt hech qaysi hisobga ulanmagan.', mainKeyboard(null));
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { telegramChatId: null, telegramUsername: null, telegramLinkedAt: null },
    });
    return ctx.reply(
      'Hisob botdan uzildi. Endi bu yerga xabarlar kelmaydi.\n\n'
      + `Qayta ulash uchun — "${LABELS.link}".`,
      mainKeyboard(null),
    );
  });

  // Ulash menyusi (/ulash + rol tugmalari), ustoz buyruqlari (/maosh,
  // /oquvchilarim) va AI Ustoz (/ustoz, /tugat).
  // Umumiy `bot.on('text')` dan OLDIN ro'yxatdan o'tishi shart.
  registerOnboarding(bot, findUserQuiet);
  registerTeacherCommands(bot, findUser);
  registerMentor(bot, findUser);
  registerPrefs(bot, findUser);

  bot.on('text', async (ctx) => {
    const text = ctx.message.text || '';

    if (text.startsWith('/')) {
      const user = await findUserQuiet(ctx);
      return ctx.reply(
        `Bunday buyruq yo'q.\n\n${help(user)}`,
        { parse_mode: 'HTML', ...panelFor(ctx, user) },
      );
    }

    // Tugma bosildimi? Bu tekshiruv AI suhbatidan OLDIN bo'lishi shart —
    // aks holda tugma yozuvi savol sifatida AI ga ketib qoladi.
    const cmd = labelCommand(text);
    if (cmd) return runLabel(ctx, cmd);

    // AI suhbati ochiq bo'lsa — savol
    if (await handleText(ctx, text)) return undefined;

    const user = await findUserQuiet(ctx);
    // Ulanmaganga buyruqlar ro'yxatidan ko'ra ulash menyusi foydaliroq
    if (!user) return welcome(ctx);
    return ctx.reply(help(user), { parse_mode: 'HTML', ...panelFor(ctx, user) });
  });

  // Bitta so'rovdagi xato botni yiqitmasin
  bot.catch((err, ctx) => {
    console.error(`❌ Telegram xatosi (${ctx.updateType}):`, err.message);
  });
}

module.exports = registerHandlers;
