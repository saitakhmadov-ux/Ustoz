// Promo kod yordamchilari.
//
// Qoida: ustozning promo kodi FAQAT o'ziga biriktirilgan kurslarda amal qiladi.
// Kodda courseId bo'lsa — faqat o'sha kursda, null bo'lsa — ustozning barcha
// kurslarida. Kod orqali kelgan sotuvda ustoz sof foydadan 60% oladi (40% emas).
const prisma = require('../config/prisma');
const { applyDiscount } = require('./earnings');

// Kodni yagona ko'rinishga keltiradi: katta harf, bo'shliqsiz.
function normalizeCode(code) {
  return String(code || '').trim().toUpperCase().replace(/\s+/g, '');
}

// Ustoz ismidan tasodifiy kod taklif qiladi, masalan "ALISHER7K2".
function suggestCode(fullName) {
  const base = String(fullName || 'USTOZ')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 7) || 'USTOZ';
  const rand = Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3);
  return `${base}${rand}`;
}

// Kod nechta marta ishlatilgan — faqat TO'LANGAN xaridlar hisoblanadi.
// Yarim qolgan (PENDING) yoki muvaffaqiyatsiz to'lov limitni yemaydi.
function promoUsageCount(promoCodeId) {
  return prisma.payment.count({ where: { promoCodeId, status: 'PAID' } });
}

// Amal muddati tugaganmi (expiresAt null bo'lsa — hech qachon tugamaydi)
function isExpired(promo, now = new Date()) {
  return !!promo.expiresAt && new Date(promo.expiresAt) <= now;
}

// Kodni kurs uchun tekshiradi.
//   code   — foydalanuvchi kiritgan kod
//   course — { id, price, instructorId }
//   userId — xarid qilayotgan foydalanuvchi (o'z kodini ishlatishga yo'l qo'yilmaydi)
// Qaytaradi: { ok: true, promo, discountPct, finalAmount } yoki { ok: false, reason }
async function resolvePromoCode(code, course, userId) {
  const normalized = normalizeCode(code);
  if (!normalized) return { ok: false, reason: 'Promo kod kiritilmadi' };

  const promo = await prisma.promoCode.findUnique({
    where: { code: normalized },
    include: { instructor: { select: { id: true, fullName: true } } },
  });
  if (!promo) return { ok: false, reason: 'Bunday promo kod topilmadi' };
  if (!promo.active) return { ok: false, reason: 'Bu promo kod faol emas' };

  // Amal muddati (belgilangan bo'lsa; null — muddatsiz)
  if (isExpired(promo)) {
    const until = new Date(promo.expiresAt).toLocaleDateString('uz-UZ');
    return { ok: false, reason: `Bu promo kodning muddati tugagan (${until})` };
  }

  // Kod egasi shu kursning ustozi bo'lishi shart
  if (!course.instructorId || course.instructorId !== promo.instructorId) {
    return { ok: false, reason: 'Bu promo kod ushbu kursga tegishli emas' };
  }
  // Kod aniq bitta kursga biriktirilgan bo'lsa — faqat o'shanda
  if (promo.courseId && promo.courseId !== course.id) {
    return { ok: false, reason: 'Bu promo kod ushbu kursga tegishli emas' };
  }
  // Ustoz o'z kodi bilan o'z kursini sotib ololmaydi
  if (userId && userId === promo.instructorId) {
    return { ok: false, reason: 'O\'z promo kodingizni ishlata olmaysiz' };
  }

  // Bir o'quvchi bitta kodni faqat bir marta ishlata oladi
  if (userId) {
    const mine = await prisma.payment.count({
      where: { promoCodeId: promo.id, userId, status: 'PAID' },
    });
    if (mine > 0) {
      return { ok: false, reason: 'Siz bu promo koddan allaqachon foydalangansiz' };
    }
  }

  // Foydalanish limiti (belgilangan bo'lsa; null — cheksiz)
  if (Number.isInteger(promo.maxUses) && promo.maxUses > 0) {
    const used = await promoUsageCount(promo.id);
    if (used >= promo.maxUses) {
      return { ok: false, reason: 'Bu promo kod foydalanish limitiga yetdi' };
    }
  }

  return {
    ok: true,
    promo,
    discountPct: promo.discountPct,
    finalAmount: applyDiscount(course.price, promo.discountPct),
  };
}

module.exports = {
  normalizeCode, suggestCode, resolvePromoCode, promoUsageCount, isExpired,
};
