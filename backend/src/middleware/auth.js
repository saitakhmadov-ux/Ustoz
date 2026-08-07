// Autentifikatsiya va rol tekshiruvchi middleware
const prisma = require('../config/prisma');
const { verifyToken } = require('../utils/jwt');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

// Tokenni "Authorization: Bearer <token>" sarlavhasi yoki cookie dan oladi
function extractToken(req) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    return header.slice(7);
  }
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }
  return null;
}

// Majburiy autentifikatsiya: kirmagan bo'lsa 401
const protect = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);
  if (!token) {
    throw ApiError.unauthorized('Tizimga kiring');
  }
  let decoded;
  try {
    decoded = verifyToken(token);
  } catch (e) {
    throw ApiError.unauthorized('Token yaroqsiz yoki muddati o\'tgan');
  }
  const user = await prisma.user.findUnique({
    where: { id: decoded.id },
    select: { id: true, fullName: true, email: true, role: true, avatarUrl: true },
  });
  if (!user) {
    throw ApiError.unauthorized('Foydalanuvchi topilmadi');
  }
  req.user = user;
  next();
});

// Ixtiyoriy autentifikatsiya: token bo'lsa req.user to'ldiriladi, bo'lmasa davom etadi
const optionalAuth = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);
  if (token) {
    try {
      const decoded = verifyToken(token);
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, fullName: true, email: true, role: true, avatarUrl: true },
      });
      if (user) req.user = user;
    } catch (e) {
      // token yaroqsiz — mehmon sifatida davom etadi
    }
  }
  next();
});

// Faqat bosh admin uchun (kategoriya, foydalanuvchi/ustoz boshqaruvi, kurs yaratish/o'chirish)
function adminOnly(req, res, next) {
  if (!req.user || req.user.role !== 'ADMIN') {
    return next(ApiError.forbidden('Bu amal faqat bosh admin uchun'));
  }
  next();
}

// Bosh admin yoki ustoz admin uchun (kurs kontenti bilan ishlash).
// Ustoz uchun aniq kurs egaligini controller ichida assertCourseAccess tekshiradi.
function adminOrInstructor(req, res, next) {
  if (!req.user || (req.user.role !== 'ADMIN' && req.user.role !== 'INSTRUCTOR')) {
    return next(ApiError.forbidden('Bu amal admin yoki ustoz uchun'));
  }
  next();
}

module.exports = { protect, optionalAuth, adminOnly, adminOrInstructor };
