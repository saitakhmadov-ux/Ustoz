// Telegram hisobini ulash tokenlari.
//
// Ikki maqsad bor:
//   LINK   — sayt (kirgan foydalanuvchi) token yaratadi -> t.me/<bot>?start=<token>
//            havolasi ochiladi -> bot tokenni tanib chatId ni hisobga bog'laydi.
//   VERIFY — ro'yxatdan o'tgan, ammo hali tasdiqlanmagan hisob. Bot havolani
//            ochganda email tasdiqlangan deb belgilanadi va hisob ayni paytda
//            botga ham ulanadi. Brauzer natijani `pollKey` orqali kutib turadi.
//
// Token bazada ochiq saqlanmaydi (faqat sha256), bir marta ishlatiladi va
// 15 daqiqada kuyadi.
const crypto = require('crypto');
const prisma = require('../config/prisma');

const TOKEN_TTL_MIN = 15;

const hashToken = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');

// Yangi token yaratadi va ochiq ko'rinishini qaytaradi (faqat havola uchun).
// Eski ishlatilmagan tokenlar bekor qilinadi — bir vaqtda bittasi amal qiladi.
//
// VERIFY uchun qo'shimcha `pollKey` qaytadi: brauzer shu kalit bilan
// "tasdiqlandimi?" deb so'raydi (statusByPollKey).
async function issueLinkToken(userId, purpose = 'LINK') {
  await prisma.telegramLink.deleteMany({ where: { userId, usedAt: null } });

  const token = crypto.randomBytes(24).toString('base64url');
  const pollKey = purpose === 'VERIFY' ? crypto.randomBytes(24).toString('base64url') : null;

  await prisma.telegramLink.create({
    data: {
      userId,
      purpose,
      tokenHash: hashToken(token),
      pollHash: pollKey ? hashToken(pollKey) : null,
      expiresAt: new Date(Date.now() + TOKEN_TTL_MIN * 60 * 1000),
    },
  });
  return { token, pollKey, expiresMin: TOKEN_TTL_MIN };
}

// Tokenni tekshiradi va hisobni chatId ga bog'laydi.
// VERIFY tokeni bo'lsa — emailni ham tasdiqlangan deb belgilaydi.
// Qaytaradi: { ok: true, user, purpose } yoki { ok: false, reason: 'invalid'|'used'|'taken' }
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

  const userData = {
    telegramChatId: String(chatId),
    telegramUsername: telegramUsername || null,
    telegramLinkedAt: new Date(),
  };
  // Tasdiqlash havolasi: hisob shu yerda faollashadi. Havolani yaratish uchun
  // parol talab qilingan, ya'ni bu — hisob egasi.
  if (row.purpose === 'VERIFY' && !row.user.emailVerifiedAt) {
    userData.emailVerifiedAt = new Date();
  }

  const [user] = await prisma.$transaction([
    prisma.user.update({ where: { id: row.userId }, data: userData }),
    prisma.telegramLink.update({
      where: { id: row.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return { ok: true, user, purpose: row.purpose };
}

// Brauzer so'rovi: "havola ochildimi?". Tasdiqlangan bo'lsa foydalanuvchini
// qaytaradi va yozuvni o'chiradi — natija bir marta olinadi.
// Qaytaradi: { status: 'pending'|'done'|'expired', user? }
async function statusByPollKey(pollKey) {
  if (!pollKey) return { status: 'expired' };

  const row = await prisma.telegramLink.findUnique({
    where: { pollHash: hashToken(pollKey) },
    include: { user: true },
  });
  if (!row) return { status: 'expired' };

  if (!row.usedAt) {
    // Muddati o'tgan bo'lsa foydasi yo'q — tozalab, yangi havola so'raymiz
    if (row.expiresAt < new Date()) {
      await prisma.telegramLink.delete({ where: { id: row.id } }).catch(() => {});
      return { status: 'expired' };
    }
    return { status: 'pending' };
  }

  await prisma.telegramLink.delete({ where: { id: row.id } }).catch(() => {});
  return { status: 'done', user: row.user };
}

module.exports = {
  issueLinkToken, consumeLinkToken, statusByPollKey, TOKEN_TTL_MIN,
};
