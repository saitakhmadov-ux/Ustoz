// To'lov controlleri (mock/test rejim — Click/Payme)
const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');
const { computeExpiry, accessInfo, accessMonthsFor } = require('../utils/learnProgress');
const { resolvePromoCode } = require('../utils/promo');
const { recordEarningForPayment } = require('../utils/recordEarning');
const { notifyPaid, notifyInstructorNewStudent } = require('../utils/notify');

// Mock tranzaksiya ID yaratish
function mockTransactionId(provider) {
  return `${provider}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// POST /api/payments — to'lov yaratish
// body: { courseId, provider: 'CLICK' | 'PAYME', promoCode?: string }
const createPayment = asyncHandler(async (req, res) => {
  const { courseId, provider, promoCode } = req.body;
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

  // Promo kod berilgan bo'lsa — tekshirib, chegirmani qo'llaymiz.
  // Yaroqsiz kod to'lovni to'xtatadi (o'quvchi kutgan narxdan boshqa summa
  // yechilib qolmasligi uchun jimgina e'tiborsiz qoldirmaymiz).
  let promoResult = null;
  if (promoCode && String(promoCode).trim()) {
    promoResult = await resolvePromoCode(promoCode, course, req.user.id);
    if (!promoResult.ok) throw ApiError.badRequest(promoResult.reason);
  }
  const finalAmount = promoResult ? promoResult.finalAmount : course.price;

  // To'lov yozuvini yaratish
  let payment = await prisma.payment.create({
    data: {
      userId: req.user.id,
      courseId,
      amount: finalAmount,
      provider,
      status: 'PENDING',
      transactionId: mockTransactionId(provider),
      promoCodeId: promoResult ? promoResult.promo.id : null,
      discountPct: promoResult ? promoResult.discountPct : 0,
      originalAmount: promoResult ? course.price : null,
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
          // muddati tugagan yozilishni yangilaymiz (progress saqlanadi);
          // yangi muddat uchun ogohlantirish belgisi ham tozalanadi
          data: { expiresAt, expiryWarnedAt: null },
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

    // To'lov PAID bo'ldi — ustoz daromadini yozamiz (kursda ustoz bo'lsa).
    // Idempotent; xatolik xaridni buzmasligi uchun alohida ushlanadi.
    try {
      await recordEarningForPayment(payment, course);
    } catch (e) {
      console.error('Daromad yozuvini yaratishda xatolik:', e);
    }

    // Bildirishnomalar (javobni kutib turmaydi). Ustozga faqat yangi
    // o'quvchi bo'lganda — muddat yangilanishi "yangi o'quvchi" emas.
    notifyPaid(req.user.id, course, payment);
    if (!existingEnrollment) {
      notifyInstructorNewStudent(course.instructorId, req.user.fullName, course);
    }
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
      promoCode: { select: { code: true, discountPct: true } },
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
