// Sertifikat controlleri
const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

// Noyob sertifikat raqami yaratish
function makeSerial() {
  const year = new Date().getFullYear();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `USTOZ-${year}-${rand}`;
}

// Kurs 100% tugatilgan bo'lsa sertifikat berish (agar mavjud bo'lmasa)
// learn.controller tomonidan chaqiriladi
async function issueCertificateIfComplete(userId, courseId) {
  const existing = await prisma.certificate.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });
  if (existing) return existing;

  // Progressni qayta tekshirish
  const lessons = await prisma.lesson.findMany({
    where: { section: { courseId } },
    select: { id: true },
  });
  if (lessons.length === 0) return null;
  const completed = await prisma.lessonProgress.count({
    where: { userId, lessonId: { in: lessons.map((l) => l.id) }, completed: true },
  });
  if (completed < lessons.length) return null;

  return prisma.certificate.create({
    data: { userId, courseId, serial: makeSerial() },
  });
}

// GET /api/me/certificates — mening sertifikatlarim
const myCertificates = asyncHandler(async (req, res) => {
  const certificates = await prisma.certificate.findMany({
    where: { userId: req.user.id },
    orderBy: { issuedAt: 'desc' },
    include: { course: { select: { title: true, slug: true } } },
  });
  res.json({ success: true, certificates });
});

// GET /api/certificates/:id — sertifikatni ko'rish (chop etish uchun)
const getCertificate = asyncHandler(async (req, res) => {
  const certificate = await prisma.certificate.findUnique({
    where: { id: req.params.id },
    include: {
      user: { select: { fullName: true } },
      course: { select: { title: true, authorName: true, slug: true } },
    },
  });
  if (!certificate) throw ApiError.notFound('Sertifikat topilmadi');
  res.json({ success: true, certificate });
});

// GET /api/certificates/verify/:serial — raqam bo'yicha tekshirish
const verifyCertificate = asyncHandler(async (req, res) => {
  const certificate = await prisma.certificate.findUnique({
    where: { serial: req.params.serial },
    include: {
      user: { select: { fullName: true } },
      course: { select: { title: true } },
    },
  });
  if (!certificate) throw ApiError.notFound('Bunday sertifikat topilmadi');
  res.json({ success: true, valid: true, certificate });
});

module.exports = {
  issueCertificateIfComplete,
  myCertificates,
  getCertificate,
  verifyCertificate,
};
