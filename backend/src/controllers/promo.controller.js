// Promo kod controlleri.
//
// Ustoz o'z promo kodini yaratadi va u orqali kelgan o'quvchidan sof foydaning
// 60% ini oladi (oddiy sotuvda 40%). Kod faqat ustozning o'z kurslarida amal
// qiladi — tekshiruv utils/promo.js dagi resolvePromoCode ichida.
const { z } = require('zod');
const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { normalizeCode, suggestCode, resolvePromoCode, isExpired } = require('../utils/promo');
const { getPayoutConfig } = require('../utils/settings');

// Kod egasi: ustoz o'zi, bosh admin esa instructorId ko'rsatishi kerak.
function resolveOwnerId(user, bodyInstructorId) {
  if (user.role === 'INSTRUCTOR') return user.id;
  if (!bodyInstructorId) throw ApiError.badRequest('instructorId ko\'rsatilmagan');
  return bodyInstructorId;
}

const createSchema = z.object({
  code: z.string().min(3, 'Kod kamida 3 belgi').max(24, 'Kod juda uzun').optional(),
  courseId: z.string().min(1).nullable().optional(),
  discountPct: z.number().int().min(0).optional(),
  // null yoki berilmasa — muddatsiz / cheksiz
  expiresAt: z.string().nullable().optional(),
  maxUses: z.number().int().nullable().optional(),
  instructorId: z.string().min(1).optional(), // faqat bosh admin uchun
});

// Amal muddati: bo'sh bo'lsa null (muddatsiz), aks holda kelajakdagi sana.
// Sana kunning oxiriga suriladi — "31-avgust" deganda o'sha kun ham amal qiladi.
function parseExpiry(value) {
  if (value === null || value === undefined || value === '') return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw ApiError.badRequest('Amal muddati sanasi noto\'g\'ri');
  // Faqat sana kelgan bo'lsa (vaqtsiz) — kunning oxirigacha amal qilsin
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    d.setHours(23, 59, 59, 999);
  }
  if (d <= new Date()) throw ApiError.badRequest('Amal muddati kelajakdagi sana bo\'lishi kerak');
  return d;
}

// Foydalanish limiti: bo'sh bo'lsa null (cheksiz), aks holda musbat butun son
function parseMaxUses(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) {
    throw ApiError.badRequest('Foydalanish limiti kamida 1 bo\'lishi kerak');
  }
  return n;
}

// Kod ustozning kursiga tegishli ekanini tekshiradi (courseId berilgan bo'lsa)
async function assertOwnCourse(instructorId, courseId) {
  if (!courseId) return null;
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, instructorId: true, title: true },
  });
  if (!course) throw ApiError.notFound('Kurs topilmadi');
  if (course.instructorId !== instructorId) {
    throw ApiError.forbidden('Bu kurs sizga biriktirilmagan');
  }
  return course;
}

// Chegirmani ruxsat etilgan chegaraga solishtiradi
async function assertDiscount(pct) {
  const config = await getPayoutConfig();
  const n = Number.isFinite(pct) ? Math.round(pct) : 0;
  if (n < 0 || n > config.maxDiscountPct) {
    throw ApiError.badRequest(`Chegirma 0 dan ${config.maxDiscountPct}% gacha bo'lishi mumkin`);
  }
  return n;
}

// GET /api/admin/teaching/promo-codes — kodlar + foydalanish statistikasi
const listPromoCodes = asyncHandler(async (req, res) => {
  const where = req.user.role === 'INSTRUCTOR'
    ? { instructorId: req.user.id }
    : (req.query.instructorId ? { instructorId: req.query.instructorId } : {});

  const codes = await prisma.promoCode.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, code: true, discountPct: true, active: true, createdAt: true,
      expiresAt: true, maxUses: true, instructorId: true,
      course: { select: { id: true, title: true, slug: true } },
      instructor: { select: { id: true, fullName: true } },
    },
  });

  const ids = codes.map((c) => c.id);
  // Keltirgan daromad va haqiqiy foydalanish soni (faqat PAID to'lovlar)
  const [sums, uses] = ids.length
    ? await Promise.all([
      prisma.earning.groupBy({
        by: ['promoCodeId'],
        where: { promoCodeId: { in: ids } },
        _sum: { instructorAmount: true, grossAmount: true },
      }),
      prisma.payment.groupBy({
        by: ['promoCodeId'],
        where: { promoCodeId: { in: ids }, status: 'PAID' },
        _count: true,
      }),
    ])
    : [[], []];
  const sumBy = Object.fromEntries(sums.map((s) => [s.promoCodeId, s._sum]));
  const useBy = Object.fromEntries(uses.map((u) => [u.promoCodeId, u._count]));

  const config = await getPayoutConfig();
  res.json({
    success: true,
    maxDiscountPct: config.maxDiscountPct,
    referralPct: config.referralInstructorPct,
    organicPct: config.organicInstructorPct,
    promoCodes: codes.map((c) => {
      const used = useBy[c.id] || 0;
      const expired = isExpired(c);
      return {
        ...c,
        uses: used,
        // Limit belgilangan bo'lsa qancha qolgani; null — cheksiz
        remaining: c.maxUses ? Math.max(0, c.maxUses - used) : null,
        expired,
        // Kod hozir amalda ishlaydimi — panelda holatni bir joydan ko'rsatish uchun
        usable: c.active && !expired && (!c.maxUses || used < c.maxUses),
        earned: (sumBy[c.id] && sumBy[c.id].instructorAmount) || 0,
        revenue: (sumBy[c.id] && sumBy[c.id].grossAmount) || 0,
      };
    }),
  });
});

// GET /api/admin/teaching/promo-codes/suggest — band bo'lmagan kod taklifi
const suggestPromoCode = asyncHandler(async (req, res) => {
  const name = req.user.role === 'INSTRUCTOR' ? req.user.fullName : 'USTOZ';
  // Band bo'lmagan kod topilguncha bir nechta urinish
  for (let i = 0; i < 10; i += 1) {
    const code = suggestCode(name);
    // eslint-disable-next-line no-await-in-loop
    const exists = await prisma.promoCode.findUnique({ where: { code } });
    if (!exists) return res.json({ success: true, code });
  }
  res.json({ success: true, code: suggestCode(`${name}${Date.now()}`) });
});

// POST /api/admin/teaching/promo-codes — yangi kod
const createPromoCode = asyncHandler(async (req, res) => {
  const data = createSchema.parse(req.body);
  const instructorId = resolveOwnerId(req.user, data.instructorId);

  const code = data.code ? normalizeCode(data.code) : suggestCode(req.user.fullName);
  if (!/^[A-Z0-9-]{3,24}$/.test(code)) {
    throw ApiError.badRequest('Kod faqat lotin harflari, raqam va chiziqchadan iborat bo\'lsin (3–24 belgi)');
  }

  const existing = await prisma.promoCode.findUnique({ where: { code } });
  if (existing) throw ApiError.conflict('Bu kod allaqachon band');

  await assertOwnCourse(instructorId, data.courseId || null);
  const discountPct = await assertDiscount(data.discountPct ?? 0);
  const expiresAt = parseExpiry(data.expiresAt);
  const maxUses = parseMaxUses(data.maxUses);

  const promo = await prisma.promoCode.create({
    data: {
      code,
      instructorId,
      courseId: data.courseId || null,
      discountPct,
      expiresAt,
      maxUses,
    },
    select: {
      id: true, code: true, discountPct: true, active: true, createdAt: true,
      expiresAt: true, maxUses: true,
      course: { select: { id: true, title: true, slug: true } },
    },
  });

  res.status(201).json({
    success: true,
    message: 'Promo kod yaratildi',
    promoCode: {
      ...promo,
      uses: 0,
      remaining: promo.maxUses,
      expired: false,
      usable: true,
      earned: 0,
      revenue: 0,
    },
  });
});

// Kodni tahrirlash/o'chirish oldidan egalikni tekshirish
async function assertPromoAccess(user, id) {
  const promo = await prisma.promoCode.findUnique({ where: { id } });
  if (!promo) throw ApiError.notFound('Promo kod topilmadi');
  if (user.role === 'ADMIN') return promo;
  if (promo.instructorId !== user.id) throw ApiError.forbidden('Bu kod sizga tegishli emas');
  return promo;
}

// PATCH /api/admin/teaching/promo-codes/:id — chegirma / faollik / kurs
const updatePromoCode = asyncHandler(async (req, res) => {
  const promo = await assertPromoAccess(req.user, req.params.id);
  const data = {};

  if (req.body.discountPct !== undefined) {
    data.discountPct = await assertDiscount(Number(req.body.discountPct));
  }
  if (req.body.active !== undefined) data.active = !!req.body.active;
  if (req.body.courseId !== undefined) {
    await assertOwnCourse(promo.instructorId, req.body.courseId || null);
    data.courseId = req.body.courseId || null;
  }
  // Muddat va limitni ham tahrirlash mumkin — bo'sh yuborilsa cheklov olib tashlanadi
  if (req.body.expiresAt !== undefined) data.expiresAt = parseExpiry(req.body.expiresAt);
  if (req.body.maxUses !== undefined) data.maxUses = parseMaxUses(req.body.maxUses);

  const updated = await prisma.promoCode.update({
    where: { id: promo.id },
    data,
    select: {
      id: true, code: true, discountPct: true, active: true, createdAt: true,
      expiresAt: true, maxUses: true,
      course: { select: { id: true, title: true, slug: true } },
    },
  });
  res.json({ success: true, message: 'Promo kod yangilandi', promoCode: updated });
});

// DELETE /api/admin/teaching/promo-codes/:id
// Kod o'chsa ham u orqali yozilgan daromad tarixi saqlanadi (Earning.promoCodeId -> null).
const deletePromoCode = asyncHandler(async (req, res) => {
  const promo = await assertPromoAccess(req.user, req.params.id);
  await prisma.promoCode.delete({ where: { id: promo.id } });
  res.json({ success: true, message: 'Promo kod o\'chirildi' });
});

// ---------- Ommaviy: checkout'da kodni tekshirish ----------
// POST /api/promo/validate  body: { code, courseId }
// Kirgan foydalanuvchi uchun (o'z kodini ishlatishga yo'l qo'yilmasligi uchun).
const validatePromoCode = asyncHandler(async (req, res) => {
  const { code, courseId } = req.body;
  if (!courseId) throw ApiError.badRequest('courseId shart');

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, price: true, isFree: true, instructorId: true, published: true },
  });
  if (!course || !course.published) throw ApiError.notFound('Kurs topilmadi');
  if (course.isFree || course.price === 0) {
    throw ApiError.badRequest('Bepul kursga promo kod qo\'llanmaydi');
  }

  const result = await resolvePromoCode(code, course, req.user ? req.user.id : null);
  if (!result.ok) {
    // 200 bilan qaytaramiz — bu forma xatosi, so'rov xatosi emas
    return res.json({ success: true, valid: false, reason: result.reason });
  }

  res.json({
    success: true,
    valid: true,
    code: result.promo.code,
    discountPct: result.discountPct,
    originalAmount: course.price,
    finalAmount: result.finalAmount,
    discountAmount: course.price - result.finalAmount,
    instructorName: result.promo.instructor ? result.promo.instructor.fullName : null,
  });
});

module.exports = {
  listPromoCodes,
  suggestPromoCode,
  createPromoCode,
  updatePromoCode,
  deletePromoCode,
  validatePromoCode,
};
