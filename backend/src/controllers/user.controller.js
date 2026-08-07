// Foydalanuvchi profili controlleri
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

const profileSchema = z.object({
  fullName: z.string().min(2, 'Ism juda qisqa').max(80).optional(),
  bio: z.string().max(300).optional().nullable(),
  avatarUrl: z.string().url('URL noto\'g\'ri').optional().nullable().or(z.literal('')),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Joriy parol shart'),
  newPassword: z.string().min(6, 'Yangi parol kamida 6 belgi'),
});

function publicUser(u) {
  return {
    id: u.id, fullName: u.fullName, email: u.email, role: u.role,
    avatarUrl: u.avatarUrl || null, bio: u.bio || null, createdAt: u.createdAt,
  };
}

// PUT /api/me — profilni yangilash
const updateProfile = asyncHandler(async (req, res) => {
  const data = profileSchema.parse(req.body);
  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: {
      ...(data.fullName !== undefined && { fullName: data.fullName }),
      ...(data.bio !== undefined && { bio: data.bio || null }),
      ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl || null }),
    },
  });
  res.json({ success: true, message: 'Profil yangilandi', user: publicUser(user) });
});

// PUT /api/me/password — parolni o'zgartirish
const changePassword = asyncHandler(async (req, res) => {
  const data = passwordSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  const match = await bcrypt.compare(data.currentPassword, user.passwordHash);
  if (!match) throw ApiError.badRequest('Joriy parol noto\'g\'ri');

  const passwordHash = await bcrypt.hash(data.newPassword, 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  res.json({ success: true, message: 'Parol muvaffaqiyatli o\'zgartirildi' });
});

// GET /api/me/stats — dashboard statistikasi
const myStats = asyncHandler(async (req, res) => {
  const [enrollmentCount, certificateCount] = await Promise.all([
    prisma.enrollment.count({ where: { userId: req.user.id } }),
    prisma.certificate.count({ where: { userId: req.user.id } }),
  ]);
  res.json({ success: true, stats: { enrollmentCount, certificateCount } });
});

module.exports = { updateProfile, changePassword, myStats };
