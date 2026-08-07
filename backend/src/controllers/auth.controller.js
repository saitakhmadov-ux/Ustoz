// Autentifikatsiya controlleri
const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { signToken } = require('../utils/jwt');
const { registerSchema, loginSchema } = require('../validators/auth.validator');

// Foydalanuvchi ma'lumotidan parolni olib tashlash
function publicUser(user) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl || null,
    bio: user.bio || null,
  };
}

// POST /api/auth/register — ro'yxatdan o'tish
const register = asyncHandler(async (req, res) => {
  const data = registerSchema.parse(req.body);

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    throw ApiError.conflict('Bu email allaqachon ro\'yxatdan o\'tgan');
  }

  const passwordHash = await bcrypt.hash(data.password, 10);
  const user = await prisma.user.create({
    data: {
      fullName: data.fullName,
      email: data.email,
      passwordHash,
      role: 'USER',
    },
  });

  const token = signToken({ id: user.id, role: user.role });

  res.status(201).json({
    success: true,
    message: 'Ro\'yxatdan muvaffaqiyatli o\'tdingiz',
    token,
    user: publicUser(user),
  });
});

// POST /api/auth/login — tizimga kirish
const login = asyncHandler(async (req, res) => {
  const data = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { email: data.email } });
  if (!user) {
    throw ApiError.unauthorized('Email yoki parol noto\'g\'ri');
  }

  const match = await bcrypt.compare(data.password, user.passwordHash);
  if (!match) {
    throw ApiError.unauthorized('Email yoki parol noto\'g\'ri');
  }

  const token = signToken({ id: user.id, role: user.role });

  res.json({
    success: true,
    message: 'Xush kelibsiz!',
    token,
    user: publicUser(user),
  });
});

// GET /api/auth/me — joriy foydalanuvchi ma'lumoti
const me = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) {
    throw ApiError.notFound('Foydalanuvchi topilmadi');
  }
  res.json({ success: true, user: publicUser(user) });
});

module.exports = { register, login, me };
