// Foydalanuvchining Telegram bog'lanishi — holat, ulash havolasi va uzish.
// Barcha yo'nalishlar /api/me ostida, kirish talab qilinadi.
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const prisma = require('../config/prisma');
const { getTelegramConfig } = require('../utils/settings');
const { getStatus } = require('../telegram/bot');
const { issueLinkToken } = require('../telegram/link');

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

// DELETE /api/me/telegram — bog'lanishni uzish
const unlink = asyncHandler(async (req, res) => {
  await prisma.user.update({
    where: { id: req.user.id },
    data: { telegramChatId: null, telegramUsername: null, telegramLinkedAt: null },
  });
  await prisma.telegramLink.deleteMany({ where: { userId: req.user.id } });
  res.json({ success: true, message: 'Telegram uzildi' });
});

module.exports = { status, createLink, unlink };
