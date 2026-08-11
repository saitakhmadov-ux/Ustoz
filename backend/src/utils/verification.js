// Bir martalik tasdiqlash kodlari — emailni tasdiqlash va parolni tiklash.
//
// Muhim qoidalar:
//  - kod bazada ochiq saqlanmaydi, faqat hash (baza sizib chiqsa ham kod bilinmaydi)
//  - kod crypto bilan generatsiya qilinadi, Math.random emas
//  - yangi kod so'ralganda eskisi bekor bo'ladi (bir vaqtda bitta amal qiladi)
//  - noto'g'ri urinishlar sanaladi; chegaradan oshsa kod kuyadi
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');

const CODE_TTL_MIN = 10; // kod necha daqiqa amal qiladi
const MAX_ATTEMPTS = 5; // bitta kod uchun noto'g'ri urinishlar chegarasi

// 6 xonali kod: "000000".."999999"
function generateCode() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

// Yangi kod chiqaradi va ochiq ko'rinishini qaytaradi (faqat yuborish uchun).
async function issueCode(userId, purpose) {
  // Shu maqsad uchun oldingi kodlar bekor qilinadi
  await prisma.verificationCode.deleteMany({ where: { userId, purpose } });

  const code = generateCode();
  const codeHash = await bcrypt.hash(code, 10);
  await prisma.verificationCode.create({
    data: {
      userId,
      purpose,
      codeHash,
      expiresAt: new Date(Date.now() + CODE_TTL_MIN * 60 * 1000),
    },
  });
  return code;
}

// Kodni tekshiradi va to'g'ri bo'lsa ishlatilgan deb belgilaydi.
// Qaytaradi: { ok: true } yoki { ok: false, reason: 'missing'|'expired'|'locked'|'wrong' }
async function consumeCode(userId, purpose, code) {
  const row = await prisma.verificationCode.findFirst({
    where: { userId, purpose, usedAt: null },
    orderBy: { createdAt: 'desc' },
  });
  if (!row) return { ok: false, reason: 'missing' };

  if (row.expiresAt < new Date()) {
    await prisma.verificationCode.delete({ where: { id: row.id } });
    return { ok: false, reason: 'expired' };
  }
  if (row.attempts >= MAX_ATTEMPTS) {
    await prisma.verificationCode.delete({ where: { id: row.id } });
    return { ok: false, reason: 'locked' };
  }

  const match = await bcrypt.compare(String(code || ''), row.codeHash);
  if (!match) {
    await prisma.verificationCode.update({
      where: { id: row.id },
      data: { attempts: { increment: 1 } },
    });
    return { ok: false, reason: 'wrong', left: MAX_ATTEMPTS - row.attempts - 1 };
  }

  await prisma.verificationCode.update({
    where: { id: row.id },
    data: { usedAt: new Date() },
  });
  return { ok: true };
}

// Xato sababini foydalanuvchiga tushunarli matnga aylantiradi
function codeErrorMessage(reason, left) {
  if (reason === 'expired') return 'Kod muddati tugagan. Yangi kod so\'rang.';
  if (reason === 'locked') return 'Juda ko\'p noto\'g\'ri urinish. Yangi kod so\'rang.';
  if (reason === 'missing') return 'Faol kod topilmadi. Yangi kod so\'rang.';
  return left > 0
    ? `Kod noto'g'ri. Yana ${left} ta urinish qoldi.`
    : 'Kod noto\'g\'ri.';
}

module.exports = { issueCode, consumeCode, codeErrorMessage, CODE_TTL_MIN, MAX_ATTEMPTS };
