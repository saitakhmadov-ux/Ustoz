// Telegram hisobini ulash tokenlari.
//
// Oqim: sayt (kirgan foydalanuvchi) token yaratadi -> t.me/<bot>?start=<token>
// havolasi ochiladi -> bot tokenni tanib chatId ni hisobga bog'laydi.
// Token bazada ochiq saqlanmaydi (faqat sha256), bir marta ishlatiladi va
// 15 daqiqada kuyadi.
const crypto = require('crypto');
const prisma = require('../config/prisma');

const TOKEN_TTL_MIN = 15;

const hashToken = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');

// Yangi token yaratadi va ochiq ko'rinishini qaytaradi (faqat havola uchun).
// Eski ishlatilmagan tokenlar bekor qilinadi — bir vaqtda bittasi amal qiladi.
async function issueLinkToken(userId) {
  await prisma.telegramLink.deleteMany({ where: { userId, usedAt: null } });

  const token = crypto.randomBytes(24).toString('base64url');
  await prisma.telegramLink.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + TOKEN_TTL_MIN * 60 * 1000),
    },
  });
  return { token, expiresMin: TOKEN_TTL_MIN };
}

// Tokenni tekshiradi va hisobni chatId ga bog'laydi.
// Qaytaradi: { ok: true, user } yoki { ok: false, reason: 'invalid'|'used'|'taken' }
async function consumeLinkToken(token, chatId, telegramUsername) {
  const row = await prisma.telegramLink.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });

  if (!row || row.expiresAt < new Date()) return { ok: false, reason: 'invalid' };
  if (row.usedAt) return { ok: false, reason: 'used' };

  // Bitta Telegram akkaunt — bitta hisob. Boshqasiga ulangan bo'lsa rad etamiz,
  // aks holda odam bilmagan holda birovning xabarlarini olishi mumkin.
  const taken = await prisma.user.findUnique({ where: { telegramChatId: String(chatId) } });
  if (taken && taken.id !== row.userId) return { ok: false, reason: 'taken' };

  await prisma.$transaction([
    prisma.user.update({
      where: { id: row.userId },
      data: {
        telegramChatId: String(chatId),
        telegramUsername: telegramUsername || null,
        telegramLinkedAt: new Date(),
      },
    }),
    prisma.telegramLink.update({
      where: { id: row.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return { ok: true, user: row.user };
}

module.exports = { issueLinkToken, consumeLinkToken, TOKEN_TTL_MIN };
