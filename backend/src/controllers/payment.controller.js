// To'lov controlleri (mock/test rejim — Click/Payme)
const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');
const { computeExpiry, accessInfo, accessMonthsFor } = require('../utils/learnProgress');

// Mock tranzaksiya ID yaratish
function mockTransactionId(provider) {
  return `${provider}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// POST /api/payments — to'lov yaratish
// body: { courseId, provider: 'CLICK' | 'PAYME' }
const createPayment = asyncHandler(async (req, res) => {
  const { courseId, provider } = req.body;
  if (!courseId) throw ApiError.badRequest('courseId shart');
  if (!['CLICK', 'PAYME'].includes(provider)) {
    throw ApiError.badRequest('provider CLICK yoki PAYME bo\'lishi kerak');
  }

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course || !course.published) throw ApiError.notFound('Kurs topilmadi');

  if (course.isFree || course.price === 0) {
    throw ApiError.badRequest('Bu kurs bepul, to\'lov shart emas');
  }

  // Allaqachon yozilgan bo'lsa — faqat muddati tugagan bo'lsa qayta xarid mumkin
  const existingEnrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: req.user.id, courseId } },
  });
  if (existingEnrollment && !accessInfo(existingEnrollment.expiresAt).expired) {
    throw ApiError.conflict('Siz bu kursga allaqachon egasiz');
  }

  // To'lov yozuvini yaratish
  let payment = await prisma.payment.create({
    data: {
      userId: req.user.id,
      courseId,
      amount: course.price,
      provider,
      status: 'PENDING',
      transactionId: mockTransactionId(provider),
    },
  });

  // ===== MOCK REJIM =====
  // Haqiqiy integratsiyada bu yerda provayder API'siga so'rov yuboriladi
  // va to'lov tasdiqlangach webhook orqali holat yangilanadi.
  if (env.paymentMock) {
    // To'lovni darhol "to'langan" deb belgilaymiz va kursga yozamiz (muddat bilan)
    const expiresAt = computeExpiry(accessMonthsFor(course));
    const enrollmentOp = existingEnrollment
      ? prisma.enrollment.update({
          where: { id: existingEnrollment.id },
          data: { expiresAt }, // muddati tugagan yozilishni yangilaymiz (progress saqlanadi)
        })
      : prisma.enrollment.create({
          data: { userId: req.user.id, courseId, expiresAt },
        });
    const [updated] = await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'PAID' },
      }),
      enrollmentOp,
    ]);
    payment = updated;
  }

  res.status(201).json({
    success: true,
    message: env.paymentMock ? 'To\'lov muvaffaqiyatli amalga oshirildi' : 'To\'lov yaratildi',
    payment,
  });
});

// GET /api/payments/:id — chek (receipt)
const getReceipt = asyncHandler(async (req, res) => {
  const payment = await prisma.payment.findUnique({
    where: { id: req.params.id },
    include: {
      course: { select: { title: true, slug: true, thumbnail: true } },
      user: { select: { fullName: true, email: true } },
    },
  });
  if (!payment) throw ApiError.notFound('To\'lov topilmadi');

  // Faqat egasi yoki admin ko'ra oladi
  if (payment.userId !== req.user.id && req.user.role !== 'ADMIN') {
    throw ApiError.forbidden('Ruxsat yo\'q');
  }

  res.json({ success: true, payment });
});

// GET /api/payments/my — mening to'lovlarim
const myPayments = asyncHandler(async (req, res) => {
  const payments = await prisma.payment.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
    include: { course: { select: { title: true, slug: true } } },
  });
  res.json({ success: true, payments });
});

module.exports = { createPayment, getReceipt, myPayments };
