// Botning o'zidan turib hisobni ulash (Telegram Mini App orqali).
//
// Oqim: /start (ulanmagan) -> "Siz kimsiz?" tugmalari -> "Hisobni ulash"
// tugmasi -> Telegram ichida saytning /telegram-link sahifasi ochiladi ->
// odam SAYTNING o'z formasida kiradi -> sahifa `initData` ni serverga yuboradi.
//
// MUHIM: bot hech qachon parol yoki tasdiqlash kodi so'ramaydi. Parol faqat
// saytning HTTPS sahifasiga kiritiladi, botga emas — shuning uchun bu yerda
// hech qanday maxfiy ma'lumot qabul qilinmaydi.
//
// Rol tugmasi faqat MATNNI moslashtiradi. Haqiqiy rol hisobdan olinadi —
// botdan turib o'ziga ustoz huquqini berib bo'lmaydi.
const { siteUrl } = require('./format');

const LINK_PATH = '/telegram-link';

// Telegram `web_app` tugmasi faqat HTTPS manzilni qabul qiladi. Lokalda
// (http://localhost) tugma o'rniga oddiy havola matnini beramiz.
function linkTarget() {
  const url = `${siteUrl()}${LINK_PATH}`;
  return { url, canButton: url.startsWith('https://') };
}

const ROLE_TEXT = {
  student: [
    '🎓 <b>O\'quvchi</b>',
    '',
    'Ulangach botda: kurslaringiz va progressingiz, AI Ustozdan savol so\'rash,',
    'to\'lov va sertifikat haqida xabarlar.',
  ].join('\n'),
  teacher: [
    '👨‍🏫 <b>Ustoz</b>',
    '',
    'Ulangach botda: maoshingiz va balansingiz, o\'quvchilaringiz kesimi,',
    'kursingizga yangi o\'quvchi yozilgani va sharhlar haqida xabarlar.',
    '',
    '<i>Eslatma: huquqlar hisobingizdan olinadi. Hisobingiz ustoz bo\'lmasa,',
    'bot o\'quvchi buyruqlarini beradi.</i>',
  ].join('\n'),
};

// Ulash yo'riqnomasi — tugma bilan (yoki HTTPS bo'lmasa havola bilan).
// Matn ham holatga qarab o'zgaradi: tugma yo'q bo'lsa "tugmani bosing" deyilmaydi.
function linkInstructions(role) {
  const { url, canButton } = linkTarget();
  const lines = [
    ROLE_TEXT[role] || ROLE_TEXT.student,
    '',
    canButton
      ? 'Ulash uchun quyidagi tugmani bosing va <b>saytdagi hisobingizga kiring</b>.'
      : 'Ulash uchun quyidagi havolani oching va <b>saytdagi hisobingizga kiring</b>.',
    'Faqat platformada ro\'yxatdan o\'tganlar ulay oladi.',
    '',
    '🔒 <i>Bot hech qachon parolingizni so\'ramaydi — parol faqat sayt sahifasiga kiritiladi.</i>',
  ];
  if (!canButton) {
    lines.push(
      '',
      `🔗 ${url}`,
      '',
      '<i>(Tugma ko\'rinmayapti, chunki sayt manzili HTTPS emas — Telegram ichki oynani',
      'faqat HTTPS uchun ochadi. Jonli saytda tugma paydo bo\'ladi.)</i>',
    );
  }

  return {
    text: lines.join('\n'),
    extra: {
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
      ...(canButton
        ? { reply_markup: { inline_keyboard: [[{ text: '🔗 Hisobni ulash', web_app: { url } }]] } }
        : {}),
    },
  };
}

// Ulanmagan foydalanuvchiga ko'rsatiladigan birinchi ekran
function welcome(ctx) {
  return ctx.reply(
    'Assalomu alaykum! Bu — <b>Ustoz</b> platformasining boti.\n\n'
    + 'Hisobingizni ulasangiz, kurslaringiz, xabarlaringiz va AI Ustoz shu yerda bo\'ladi.\n\n'
    + '<b>Siz kimsiz?</b>',
    {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🎓 O\'quvchiman', callback_data: 'link:student' }],
          [{ text: '👨‍🏫 Ustozman', callback_data: 'link:teacher' }],
        ],
      },
    },
  );
}

// findUserQuiet — ulangan foydalanuvchini jimgina qidiradi (handlers.js dan)
function registerOnboarding(bot, findUserQuiet) {
  // Rol tanlandi — ulash yo'riqnomasini beramiz
  bot.action(/^link:(student|teacher)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const linked = await findUserQuiet(ctx);
    if (linked) {
      return ctx.reply('Hisobingiz allaqachon ulangan. Buyruqlar: /yordam');
    }
    const { text, extra } = linkInstructions(ctx.match[1]);
    return ctx.reply(text, extra);
  });

  // /ulash — menyuga qaytish (yoki holatni bilish)
  bot.command('ulash', async (ctx) => {
    const linked = await findUserQuiet(ctx);
    if (linked) {
      return ctx.reply(
        'Hisobingiz allaqachon ulangan.\n\n'
        + 'Boshqa hisobga ulamoqchi bo\'lsangiz — avval /uzish buyrug\'ini bering.',
      );
    }
    return welcome(ctx);
  });
}

module.exports = { registerOnboarding, welcome, linkInstructions };
