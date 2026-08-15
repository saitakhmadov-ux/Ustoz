// Botdagi bildirishnoma sozlamalari — /sozlamalar.
//
// Har bir hodisa uchun bitta tugma: ✅ yoqilgan / ⬜ o'chirilgan. Tugma bosilganda
// holat teskarisiga o'giriladi va xabarning o'zi yangilanadi (yangi xabar
// yubormaymiz — suhbat toza qoladi).
//
// Sozlama saytdagi profil sahifasi bilan bir xil joyda saqlanadi
// (utils/notifyPrefs.js), ya'ni ikki tomonda ham bir xil ko'rinadi.
const { eventsFor, isEventOn, toggleKey } = require('../utils/notifyPrefs');

const INTRO = [
  '<b>Bildirishnoma sozlamalari</b>',
  '',
  'Qaysi xabarlar Telegram\'ga kelishini tanlang.',
  'Tugmani bosing: ✅ — keladi, ⬜ — kelmaydi.',
  '',
  '<i>O\'chirilgan xabarlar ham saytdagi "Xabarlar" bo\'limida saqlanadi —',
  'hech narsa yo\'qolmaydi.</i>',
].join('\n');

// Holatga mos tugmalar to'plami
function prefsKeyboard(user) {
  return {
    inline_keyboard: eventsFor(user.role).map((e) => [{
      text: `${isEventOn(user, e.key) ? '✅' : '⬜'} ${e.label}`,
      callback_data: `pref:${e.key}`,
    }]),
  };
}

function prefsCommand(ctx, user) {
  return ctx.reply(INTRO, { parse_mode: 'HTML', reply_markup: prefsKeyboard(user) });
}

// findUser — ulangan foydalanuvchini topadi (handlers.js dan)
function registerPrefs(bot, findUser) {
  bot.command('sozlamalar', async (ctx) => {
    const user = await findUser(ctx);
    if (!user) return undefined;
    return prefsCommand(ctx, user);
  });

  bot.action(/^pref:(.+)$/, async (ctx) => {
    const user = await findUser(ctx);
    if (!user) return ctx.answerCbQuery();

    const key = ctx.match[1];
    const nowOn = await toggleKey(user, key);
    if (nowOn === null) return ctx.answerCbQuery('Bunday sozlama yo\'q');

    await ctx.answerCbQuery(nowOn ? 'Yoqildi' : 'O\'chirildi');
    // Tugmalarni yangi holat bilan qayta chizamiz (bazaga qayta bormasdan)
    return ctx.editMessageReplyMarkup(prefsKeyboard(applied(user, key, nowOn)))
      .catch(() => {}); // xabar o'zgarmasa Telegram xato beradi — muhim emas
  });
}

// Toggle natijasini foydalanuvchi obyektiga qo'llaydi
function applied(user, key, nowOn) {
  if (key === 'daily') return { ...user, progressPingOff: !nowOn };
  const off = new Set(user.notifyOff || []);
  if (nowOn) off.delete(key);
  else off.add(key);
  return { ...user, notifyOff: [...off] };
}

module.exports = { registerPrefs, prefsCommand };
