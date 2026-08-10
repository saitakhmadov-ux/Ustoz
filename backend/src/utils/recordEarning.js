// To'langan xariddan ustoz daromadi yozuvini yaratish.
//
// Bu funksiya to'lov PAID holatiga o'tganda chaqiriladi (hozir mock rejimda
// darhol, keyinchalik provayder webhook'ida — chaqiruv joyi bitta).
//
// Idempotent: Earning.paymentId unique, shuning uchun bitta to'lovdan ikkinchi
// marta daromad yozilmaydi (takroriy webhook kelsa ham xavfsiz).
//
// Kursga ustoz biriktirilmagan bo'lsa daromad yozuvi YARATILMAYDI — bunday
// sotuvdan soliqdan keyingi butun mablag' tizimga qoladi va admin hisobotida
// "biriktirilmagan kurslar" sifatida alohida ko'rsatiladi.
const prisma = require('../config/prisma');
const { splitPayment } = require('./earnings');
const { getPayoutConfig } = require('./settings');

// payment — { id, courseId, amount, promoCodeId }
// course  — { id, instructorId }  (berilmasa bazadan o'qiladi)
// Qaytaradi: yaratilgan Earning yoki null (ustoz yo'q / allaqachon yozilgan).
async function recordEarningForPayment(payment, course = null) {
  if (!payment || !payment.id) return null;

  const c = course || await prisma.course.findUnique({
    where: { id: payment.courseId },
    select: { id: true, instructorId: true },
  });
  if (!c || !c.instructorId) return null;

  // Allaqachon yozilganmi?
  const existing = await prisma.earning.findUnique({ where: { paymentId: payment.id } });
  if (existing) return existing;

  // Promo kod shu ustozga tegishli bo'lsagina REFERRAL hisoblanadi.
  let source = 'ORGANIC';
  let promoCodeId = null;
  if (payment.promoCodeId) {
    const promo = await prisma.promoCode.findUnique({
      where: { id: payment.promoCodeId },
      select: { id: true, instructorId: true },
    });
    if (promo && promo.instructorId === c.instructorId) {
      source = 'REFERRAL';
      promoCodeId = promo.id;
    }
  }

  const config = await getPayoutConfig();
  const split = splitPayment(payment.amount, source, config);

  try {
    return await prisma.earning.create({
      data: {
        paymentId: payment.id,
        instructorId: c.instructorId,
        courseId: c.id,
        grossAmount: split.grossAmount,
        taxAmount: split.taxAmount,
        netAmount: split.netAmount,
        instructorAmount: split.instructorAmount,
        platformAmount: split.platformAmount,
        taxPct: split.taxPct,
        sharePct: split.sharePct,
        source: split.source,
        promoCodeId,
      },
    });
  } catch (e) {
    // Poyga holati: ikkita so'rov bir vaqtda kelsa unique cheklov ishlaydi (P2002).
    if (e.code === 'P2002') {
      return prisma.earning.findUnique({ where: { paymentId: payment.id } });
    }
    throw e;
  }
}

module.exports = { recordEarningForPayment };
