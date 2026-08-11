// Autentifikatsiya controlleri
//
// Ro'yxatdan o'tish oqimi: register -> emailga 6 xonali kod -> verify-email -> token.
// Token faqat tasdiqlangandan keyin beriladi, shuning uchun bot ochgan akkaunt
// hech qanday imkoniyatga ega bo'lmaydi.
const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { signToken } = require('../utils/jwt');
const { assertHuman } = require('../utils/humanCheck');
const { issueCode, consumeCode, codeErrorMessage } = require('../utils/verification');
const {
  sendVerifyEmail, sendPasswordResetEmail, sendPasswordChangedEmail,
} = require('../utils/authEmails');
const {
  registerSchema, loginSchema, verifyEmailSchema, emailOnlySchema, resetPasswordSchema,
} = require('../validators/auth.validator');

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

  // Parol to'g'ri, ammo email tasdiqlanmagan — frontend tasdiqlash sahifasiga yo'naltiradi
  if (!user.emailVerifiedAt) {
    const err = ApiError.forbidden('Email tasdiqlanmagan. Emailingizga yuborilgan kodni kiriting.');
    err.code = 'EMAIL_NOT_VERIFIED';
    throw err;
  }

  authResponse(res, user, 'Xush kelibsiz!');
});

// POST /api/auth/forgot-password — parolni tiklash kodini yuborish.
// Javob har doim bir xil: qaysi email ro'yxatda borligini oshkor qilmaymiz.
const forgotPassword = asyncHandler(async (req, res) => {
  await assertHuman(req);
  const { email } = emailOnlySchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    const code = await issueCode(user.id, 'PASSWORD_RESET');
    await sendPasswordResetEmail(user.email, user.fullName, code);
  }

  res.json({
    success: true,
    message: 'Agar bunday akkaunt mavjud bo\'lsa, parolni tiklash kodi yuborildi.',
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
      // Kod emailga kelgan — demak email egasi shu odam. Tasdiqlanmagan
      // bo'lsa ham endi tasdiqlangan hisoblanadi.
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
  register, verifyEmail, resendCode, login, forgotPassword, resetPassword, me,
};
