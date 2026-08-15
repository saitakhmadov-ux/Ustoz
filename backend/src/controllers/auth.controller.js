// Autentifikatsiya controlleri
//
// Ro'yxatdan o'tish oqimi: register -> emailga 6 xonali kod -> verify-email -> token.
// Token faqat tasdiqlangandan keyin beriladi, shuning uchun bot ochgan akkaunt
// hech qanday imkoniyatga ega bo'lmaydi.
//
// Ikkinchi yo'l — Telegram: register javobidagi `pendingToken` bilan bir martalik
// t.me havolasi olinadi, odam botda "Start" bosadi, brauzer esa natijani
// `pollKey` orqali kutib turadi. Email umuman jo'natilmaydi (Gmail kunlik
// chegarasi shu tarzda chetlab o'tiladi).
const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { signToken, verifyToken } = require('../utils/jwt');
const { assertHuman } = require('../utils/humanCheck');
const { issueCode, consumeCode, codeErrorMessage } = require('../utils/verification');
const { issueLinkToken, statusByPollKey } = require('../telegram/link');
const { linkBotUsername, sendMessage } = require('../telegram/bot');
const {
  sendVerifyEmail, sendPasswordResetEmail, sendPasswordChangedEmail,
} = require('../utils/authEmails');
const {
  registerSchema, loginSchema, verifyEmailSchema, emailOnlySchema, resetPasswordSchema,
} = require('../validators/auth.validator');

// Tasdiqlash uchun qisqa muddatli token. Seans tokeni EMAS: `scope` maydoni
// bor, `protect` middleware esa scope'li tokenni rad etadi. Faqat shu hisobning
// tasdiqlash havolasini olishga yaraydi.
const PENDING_TTL = '30m';
const signPendingToken = (user) => signToken({ id: user.id, scope: 'verify' }, { expiresIn: PENDING_TTL });

// pendingToken dan foydalanuvchi id sini oladi
function readPendingToken(token) {
  let decoded;
  try {
    decoded = verifyToken(String(token || ''));
  } catch {
    throw ApiError.unauthorized('Tasdiqlash muddati tugadi. Qaytadan kiring.');
  }
  if (decoded.scope !== 'verify' || !decoded.id) {
    throw ApiError.unauthorized('Tasdiqlash muddati tugadi. Qaytadan kiring.');
  }
  return decoded.id;
}

// Foydalanuvchi ma'lumotidan parolni olib tashlash
function publicUser(user) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone || null,
    role: user.role,
    avatarUrl: user.avatarUrl || null,
    bio: user.bio || null,
    emailVerified: Boolean(user.emailVerifiedAt),
  };
}

function authResponse(res, user, message, status = 200) {
  const token = signToken({ id: user.id, role: user.role });
  res.status(status).json({ success: true, message, token, user: publicUser(user) });
}

// POST /api/auth/register — ro'yxatdan o'tish (token BERMAYDI)
const register = asyncHandler(async (req, res) => {
  await assertHuman(req);
  const data = registerSchema.parse(req.body);

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    // Tasdiqlanmagan akkaunt bo'lsa — yangi kod yuborib, tasdiqlashga yo'naltiramiz.
    // Aks holda odam "email band" xabariga tushib, o'z akkauntiga kira olmay qoladi.
    if (!existing.emailVerifiedAt) {
      const code = await issueCode(existing.id, 'EMAIL_VERIFY');
      await sendVerifyEmail(existing.email, existing.fullName, code);
      return res.status(200).json({
        success: true,
        needsVerification: true,
        email: existing.email,
        pendingToken: signPendingToken(existing),
        message: 'Bu email allaqachon kiritilgan, ammo tasdiqlanmagan. Yangi kod yuborildi.',
      });
    }
    throw ApiError.conflict('Bu email allaqachon ro\'yxatdan o\'tgan');
  }

  const passwordHash = await bcrypt.hash(data.password, 10);
  const user = await prisma.user.create({
    data: {
      fullName: data.fullName,
      email: data.email,
      passwordHash,
      role: 'USER',
      // emailVerifiedAt null — tasdiqlanmaguncha akkaunt ishlamaydi
    },
  });

  const code = await issueCode(user.id, 'EMAIL_VERIFY');
  await sendVerifyEmail(user.email, user.fullName, code);

  res.status(201).json({
    success: true,
    needsVerification: true,
    email: user.email,
    // Telegram orqali tasdiqlash uchun kalit (30 daqiqa)
    pendingToken: signPendingToken(user),
    message: 'Emailingizga 6 xonali tasdiqlash kodi yuborildi.',
  });
});

// POST /api/auth/verify-email — kodni tekshirib, akkauntni faollashtiradi
const verifyEmail = asyncHandler(async (req, res) => {
  const { email, code } = verifyEmailSchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw ApiError.notFound('Bunday foydalanuvchi topilmadi');

  // Allaqachon tasdiqlangan bo'lsa — shunchaki kiritamiz
  if (user.emailVerifiedAt) {
    return authResponse(res, user, 'Email allaqachon tasdiqlangan');
  }

  const result = await consumeCode(user.id, 'EMAIL_VERIFY', code);
  if (!result.ok) throw ApiError.badRequest(codeErrorMessage(result.reason, result.left));

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { emailVerifiedAt: new Date() },
  });

  authResponse(res, updated, 'Email tasdiqlandi. Xush kelibsiz!');
});

// POST /api/auth/resend-code — tasdiqlash kodini qayta yuborish.
// Foydalanuvchi bor-yo'qligini oshkor qilmaydi.
const resendCode = asyncHandler(async (req, res) => {
  const { email } = emailOnlySchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email } });

  if (user && !user.emailVerifiedAt) {
    const code = await issueCode(user.id, 'EMAIL_VERIFY');
    await sendVerifyEmail(user.email, user.fullName, code);
  }

  res.json({
    success: true,
    message: 'Agar bunday tasdiqlanmagan akkaunt mavjud bo\'lsa, kod yuborildi.',
  });
});

// POST /api/auth/login — tizimga kirish
const login = asyncHandler(async (req, res) => {
  const data = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { email: data.email } });
  if (!user) throw ApiError.unauthorized('Email yoki parol noto\'g\'ri');

  const match = await bcrypt.compare(data.password, user.passwordHash);
  if (!match) throw ApiError.unauthorized('Email yoki parol noto\'g\'ri');

  // Parol to'g'ri, ammo email tasdiqlanmagan — frontend tasdiqlash sahifasiga
  // yo'naltiradi. Parol shu yerda tekshirilgani uchun `pendingToken` ni beramiz:
  // u bilan Telegram orqali tasdiqlash havolasini olish mumkin.
  if (!user.emailVerifiedAt) {
    const err = ApiError.forbidden('Email tasdiqlanmagan. Emailingizga yuborilgan kodni kiriting.');
    err.code = 'EMAIL_NOT_VERIFIED';
    err.data = { email: user.email, pendingToken: signPendingToken(user) };
    throw err;
  }

  authResponse(res, user, 'Xush kelibsiz!');
});

// POST /api/auth/telegram-verify/start — Telegram orqali tasdiqlash havolasi.
//
// Kirish kaliti — `pendingToken` (register yoki parol bilan kirishda beriladi),
// ya'ni havolani faqat parolni bilgan odam ola oladi. Aks holda begona odam
// birovning yangi hisobini o'z Telegramiga ulab olishi mumkin bo'lardi.
const telegramVerifyStart = asyncHandler(async (req, res) => {
  const userId = readPendingToken(req.body?.pendingToken);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw ApiError.notFound('Foydalanuvchi topilmadi');
  if (user.emailVerifiedAt) {
    throw ApiError.badRequest('Hisob allaqachon tasdiqlangan. Tizimga kiring.');
  }

  const botUsername = await linkBotUsername();
  if (!botUsername) {
    throw ApiError.badRequest('Telegram tasdiqlash hozircha mavjud emas. Email kodidan foydalaning.');
  }

  const { token, pollKey, expiresMin } = await issueLinkToken(user.id, 'VERIFY');
  res.json({
    success: true,
    url: `https://t.me/${botUsername}?start=${token}`,
    botUsername,
    pollKey,
    expiresMin,
  });
});

// POST /api/auth/telegram-verify/status — brauzer "tasdiqlandimi?" deb so'raydi.
// Tasdiqlangan bo'lsa seans shu yerda boshlanadi.
const telegramVerifyStatus = asyncHandler(async (req, res) => {
  const result = await statusByPollKey(req.body?.pollKey);

  if (result.status === 'done') {
    return authResponse(res, result.user, 'Hisob tasdiqlandi. Xush kelibsiz!');
  }
  res.json({ success: true, status: result.status });
});

// POST /api/auth/forgot-password — parolni tiklash kodini yuborish.
// Javob har doim bir xil: qaysi email ro'yxatda borligini oshkor qilmaymiz.
//
// Telegram ulangan bo'lsa kod o'sha yerga boradi — tezroq yetadi va email
// chegarasini yemaydi. Yuborilmasa email zaxira yo'l bo'lib qoladi.
const forgotPassword = asyncHandler(async (req, res) => {
  await assertHuman(req);
  const { email } = emailOnlySchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    const code = await issueCode(user.id, 'PASSWORD_RESET');

    let viaTelegram = false;
    if (user.telegramChatId) {
      const sent = await sendMessage(
        user.telegramChatId,
        '<b>Parolni tiklash</b>\n\n'
        + `Kod: <code>${code}</code>\n\n`
        + '10 daqiqa amal qiladi. Bu so\'rovni siz yubormagan bo\'lsangiz, '
        + 'xabarni e\'tiborsiz qoldiring — parolingiz o\'zgarmaydi.\n\n'
        + '🔒 Kodni hech kimga bermang. Bot hech qachon kod so\'ramaydi.',
      );
      viaTelegram = sent.sent;
    }
    if (!viaTelegram) {
      await sendPasswordResetEmail(user.email, user.fullName, code);
    }
  }

  res.json({
    success: true,
    message: 'Agar bunday akkaunt mavjud bo\'lsa, parolni tiklash kodi yuborildi. '
      + 'Telegram ulangan bo\'lsa kod botga keladi, aks holda emailga.',
  });
});

// POST /api/auth/reset-password — kod bilan yangi parol o'rnatish
const resetPassword = asyncHandler(async (req, res) => {
  const { email, code, password } = resetPasswordSchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw ApiError.badRequest('Kod noto\'g\'ri yoki muddati tugagan');

  const result = await consumeCode(user.id, 'PASSWORD_RESET', code);
  if (!result.ok) throw ApiError.badRequest(codeErrorMessage(result.reason, result.left));

  const passwordHash = await bcrypt.hash(password, 10);
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      // Kod egasining kanaliga (email yoki ulangan Telegram) yuborilgan va
      // qaytib keldi — demak hisob egasi shu odam. Tasdiqlanmagan bo'lsa ham
      // endi tasdiqlangan hisoblanadi.
      emailVerifiedAt: user.emailVerifiedAt || new Date(),
    },
  });

  // Qolgan barcha kodlar bekor qilinadi
  await prisma.verificationCode.deleteMany({ where: { userId: user.id } });
  await sendPasswordChangedEmail(updated.email, updated.fullName);

  authResponse(res, updated, 'Parol yangilandi');
});

// GET /api/auth/me — joriy foydalanuvchi ma'lumoti
const me = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) throw ApiError.notFound('Foydalanuvchi topilmadi');
  res.json({ success: true, user: publicUser(user) });
});

module.exports = {
  register,
  verifyEmail,
  resendCode,
  login,
  forgotPassword,
  resetPassword,
  me,
  telegramVerifyStart,
  telegramVerifyStatus,
};
