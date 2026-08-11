// Telegram bot buyruqlari.
//
// Xavfsizlik qoidasi: bot faqat O'ZI ULANGAN hisobning ma'lumotini ko'rsatadi.
// Ulash saytda boshlanadi (bir martalik havola), shuning uchun begona odam
// birovning hisobiga ula olmaydi. Parol, to'lov ma'lumoti va tasdiqlash
// kodlari bu yerda hech qachon ko'rsatilmaydi.
const prisma = require('../config/prisma');
const env = require('../config/env');
const { consumeLinkToken } = require('./link');
const { accessInfo, accessMonthsFor } = require('../utils/learnProgress');

// computeProgress ataylab shu yerda emas, ishlatilgan joyda yuklanadi:
// controller -> utils/notify -> telegram/bot -> handlers halqasi hosil bo'lmasin
// (yuqorida yuklansa, notify.js bot.js dan sendMessage'ni ololmay qoladi).
const computeProgress = (...args) => require('../controllers/enrollment.controller').computeProgress(...args);

// CLIENT_URL bir nechta manzil bo'lishi mumkin — havolada birinchisini ishlatamiz
const siteUrl = () => String(env.clientUrl).split(',')[0].trim().replace(/\/+$/, '');

// HTML rejimida yuborilgani uchun foydalanuvchi matnini himoyalaymiz
const esc = (s) => String(s || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

// "████░░░░ 45%" ko'rinishidagi progress chizig'i
function bar(percent) {
  const filled = Math.round((Math.max(0, Math.min(100, percent)) / 100) * 10);
  return `${'█'.repeat(filled)}${'░'.repeat(10 - filled)} ${percent}%`;
}

const HELP = [
  '<b>Ustoz bot buyruqlari</b>',
  '',
  '/kurslarim — kurslarim va progress',
  '/yordam — shu ro\'yxat',
  '/uzish — hisobni botdan uzish',
  '',
  `Sayt: ${siteUrl()}`,
].join('\n');

// Ulangan foydalanuvchini topadi. Topilmasa foydalanuvchiga yo'l ko'rsatadi.
async function findUser(ctx) {
  const chatId = String(ctx.chat?.id || '');
  const user = chatId
    ? await prisma.user.findUnique({ where: { telegramChatId: chatId } })
    : null;
  if (!user) {
    await ctx.reply(
      'Hisobingiz hali ulanmagan.\n\n'
      + `Saytga kiring → Profil → "Telegram'ga ulash" tugmasini bosing:\n${siteUrl()}/profile`,
    );
    return null;
  }
  return user;
}

function registerHandlers(bot) {
  // /start — ulash havolasi bilan kelsa hisobni bog'laydi
  bot.start(async (ctx) => {
    const token = (ctx.startPayload || '').trim();

    if (token) {
      const res = await consumeLinkToken(token, ctx.chat.id, ctx.from?.username);
      if (res.ok) {
        return ctx.reply(
          `Salom, ${esc(res.user.fullName)}! ✅\n\n`
          + 'Hisobingiz botga ulandi. Endi kurslaringiz va xabarlaringizni shu yerdan olasiz.\n\n'
          + HELP,
          { parse_mode: 'HTML' },
        );
      }
      const reasons = {
        invalid: 'Havola yaroqsiz yoki muddati tugagan. Saytdan yangi havola oling.',
        used: 'Bu havola allaqachon ishlatilgan. Saytdan yangi havola oling.',
        taken: 'Bu Telegram akkaunt boshqa hisobga ulangan. Avval /uzish buyrug\'ini bering.',
      };
      return ctx.reply(reasons[res.reason] || 'Ulashda xatolik. Qayta urinib ko\'ring.');
    }

    const chatId = String(ctx.chat.id);
    const linked = await prisma.user.findUnique({ where: { telegramChatId: chatId } });
    if (linked) {
      return ctx.reply(`Salom, ${esc(linked.fullName)}! 👋\n\n${HELP}`, { parse_mode: 'HTML' });
    }

    return ctx.reply(
      'Assalomu alaykum! Bu — <b>Ustoz</b> platformasining boti.\n\n'
      + 'Kurslaringiz, progressingiz va xabarlaringizni shu yerdan olishingiz mumkin.\n\n'
      + 'Boshlash uchun saytga kiring → Profil → "Telegram\'ga ulash":\n'
      + `${siteUrl()}/profile`,
      { parse_mode: 'HTML' },
    );
  });

  bot.command('yordam', (ctx) => ctx.reply(HELP, { parse_mode: 'HTML' }));
  bot.help((ctx) => ctx.reply(HELP, { parse_mode: 'HTML' }));

  // /kurslarim — yozilgan kurslar, progress va kirish muddati
  bot.command('kurslarim', async (ctx) => {
    const user = await findUser(ctx);
    if (!user) return undefined;

    const enrollments = await prisma.enrollment.findMany({
      where: { userId: user.id },
      include: { course: { select: { id: true, title: true, slug: true, level: true } } },
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
      const progress = await computeProgress(user.id, e.courseId);
      const access = accessInfo(e.expiresAt, accessMonthsFor(e.course));

      let muddat = '';
      if (access.expired) muddat = '\n⛔ Kirish muddati tugagan';
      else if (access.daysLeft !== null && access.daysLeft <= 7) muddat = `\n⚠️ ${access.daysLeft} kun qoldi`;

      lines.push(
        `📘 <b>${esc(e.course.title)}</b>\n`
        + `${bar(progress.percent)}${muddat}\n`
        + `${siteUrl()}/learn/${e.course.slug}`,
        '',
      );
    }

    return ctx.reply(lines.join('\n'), { parse_mode: 'HTML' });
  });

  // /uzish — bog'lanishni bekor qilish
  bot.command('uzish', async (ctx) => {
    const chatId = String(ctx.chat.id);
    const user = await prisma.user.findUnique({ where: { telegramChatId: chatId } });
    if (!user) return ctx.reply('Bu Telegram akkaunt hech qaysi hisobga ulanmagan.');

    await prisma.user.update({
      where: { id: user.id },
      data: { telegramChatId: null, telegramUsername: null, telegramLinkedAt: null },
    });
    return ctx.reply(
      'Hisob botdan uzildi. Endi bu yerga xabarlar kelmaydi.\n\n'
      + 'Qayta ulash uchun: saytda Profil → "Telegram\'ga ulash".',
    );
  });

  // Buyruq bo'lmagan matnlar — nima qilish mumkinligini eslatamiz
  bot.on('text', async (ctx) => {
    if ((ctx.message.text || '').startsWith('/')) {
      return ctx.reply('Bunday buyruq yo\'q.\n\n' + HELP, { parse_mode: 'HTML' });
    }
    return ctx.reply(HELP, { parse_mode: 'HTML' });
  });

  // Bitta so'rovdagi xato botni yiqitmasin
  bot.catch((err, ctx) => {
    console.error(`❌ Telegram xatosi (${ctx.updateType}):`, err.message);
  });
}

module.exports = registerHandlers;
