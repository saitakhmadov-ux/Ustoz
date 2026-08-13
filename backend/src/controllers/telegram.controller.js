// Foydalanuvchining Telegram bog'lanishi — holat, ulash havolasi va uzish.
// Barcha yo'nalishlar /api/me ostida, kirish talab qilinadi.
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const prisma = require('../config/prisma');
const { getTelegramConfig } = require('../utils/settings');
const { getStatus, sendMessage } = require('../telegram/bot');
const { issueLinkToken } = require('../telegram/link');
const { verifyInitData, initDataErrorMessage } = require('../utils/telegramWebApp');
const { mainKeyboard } = require('../telegram/keyboard');

// Foydalanuvchiga ko'rsatiladigan holat
function view(user, cfg, botStatus) {
  return {
    linked: Boolean(user.telegramChatId),
    username: user.telegramUsername || null,
    linkedAt: user.telegramLinkedAt,
    botUsername: cfg.botUsername || botStatus.username || null,
    // Bot sozlanmagan bo'lsa tugmani ko'rsatishdan ma'no yo'q
    available: Boolean(cfg.token && cfg.enabled && botStatus.running),
  };
}

// GET /api/me/telegram
const status = asyncHandler(async (req, res) => {
  const [user, cfg] = await Promise.all([
    prisma.user.findUnique({ where: { id: req.user.id } }),
    getTelegramConfig(),
  ]);
  res.json({ success: true, telegram: view(user, cfg, getStatus()) });
});

// POST /api/me/telegram/link — bir martalik ulash havolasini qaytaradi
const createLink = asyncHandler(async (req, res) => {
  const cfg = await getTelegramConfig();
  const botStatus = getStatus();

  if (!cfg.token || !cfg.enabled) {
    throw ApiError.badRequest('Telegram bot hozircha sozlanmagan.');
  }
  const botUsername = cfg.botUsername || botStatus.username;
  if (!botUsername) {
    throw ApiError.badRequest('Bot nomi aniqlanmadi. Administrator botni qayta ishga tushirsin.');
  }

  const { token, expiresMin } = await issueLinkToken(req.user.id);
  res.json({
    success: true,
    url: `https://t.me/${botUsername}?start=${token}`,
    botUsername,
    expiresMin,
  });
});

// POST /api/me/telegram/webapp-link — Telegram Mini App ichidan ulash.
//
// Oqim: botdagi "Hisobni ulash" tugmasi sayt sahifasini Telegram ichida ochadi ->
// odam o'z parolini SAYTNING o'zida kiritadi (parol botga hech qachon bormaydi) ->
// sahifa Telegram bergan `initData` ni shu yerga yuboradi.
//
// Ishonch manbai: `initData` bot tokeni bilan imzolangan, ya'ni Telegram
// foydalanuvchisini soxtalashtirib bo'lmaydi. Kim ekanligi esa JWT dan olinadi.
const webappLink = asyncHandler(async (req, res) => {
  const cfg = await getTelegramConfig();
  if (!cfg.token || !cfg.enabled) {
    throw ApiError.badRequest('Telegram bot hozircha sozlanmagan.');
  }

  const check = verifyInitData(req.body?.initData, cfg.token);
  if (!check.ok) throw ApiError.badRequest(initDataErrorMessage(check.reason));

  // Shaxsiy chatda chat id = foydalanuvchi id
  const chatId = String(check.user.id);
  const username = check.user.username || null;

  // Bitta Telegram akkaunt — bitta hisob
  const taken = await prisma.user.findUnique({ where: { telegramChatId: chatId } });
  if (taken && taken.id !== req.user.id) {
    throw ApiError.conflict(
      'Bu Telegram akkaunt boshqa hisobga ulangan. Avval botda /uzish buyrug\'ini bering.',
    );
  }

  const current = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { fullName: true, role: true, telegramChatId: true },
  });
  const previousChatId = current?.telegramChatId && current.telegramChatId !== chatId
    ? current.telegramChatId
    : null;

  await prisma.user.update({
    where: { id: req.user.id },
    data: {
      telegramChatId: chatId,
      telegramUsername: username,
      telegramLinkedAt: new Date(),
    },
  });
  // Saytdan olingan eski havolalar endi keraksiz
  await prisma.telegramLink.deleteMany({ where: { userId: req.user.id, usedAt: null } });

  // Eski Telegram akkaunt bo'lgan bo'lsa — egasi bilib tursin
  if (previousChatId) {
    await sendMessage(
      previousChatId,
      '⚠️ Hisobingiz boshqa Telegram akkauntga ulandi. Bu siz bo\'lmasangiz, '
      + 'saytga kirib parolingizni almashtiring.',
    );
  }

  // Yangi chatga salom — ulanish haqiqatan ishlaganini odam darhol ko'radi.
  // Shu xabar bilan birga rolga mos tugmalar paneli ham o'rnatiladi.
  await sendMessage(
    chatId,
    `Salom, ${current?.fullName || ''}! ✅\n\n`
    + 'Hisobingiz botga ulandi. Quyidagi tugmalardan foydalaning.',
    mainKeyboard(current),
  );

  res.json({ success: true, message: 'Telegram ulandi', role: current?.role || 'USER' });
});

// DELETE /api/me/telegram — bog'lanishni uzish
const unlink = asyncHandler(async (req, res) => {
  await prisma.user.update({
    where: { id: req.user.id },
    data: { telegramChatId: null, telegramUsername: null, telegramLinkedAt: null },
  });
  await prisma.telegramLink.deleteMany({ where: { userId: req.user.id } });
  res.json({ success: true, message: 'Telegram uzildi' });
});

module.exports = { status, createLink, webappLink, unlink };
