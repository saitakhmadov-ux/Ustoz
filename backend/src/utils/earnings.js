// Ustoz maoshi (daromadi) hisob-kitobi — sof funksiyalar (prisma'siz).
//
// Qoida:
//   1. O'quvchi to'lagan summadan (gross) avval SOLIQ ushlab qolinadi (standart 12%).
//   2. Qolgan sof foyda ustoz va tizim o'rtasida taqsimlanadi:
//      - ORGANIC  (oddiy sotuv)        -> ustozga 40%, tizimga 60%
//      - REFERRAL (ustoz promo kodi)   -> ustozga 60%, tizimga 40%
//
// Yaxlitlash: soliq va ustoz ulushi yaxlitlanadi, TIZIM ulushi esa qoldiqdan
// olinadi. Shu sababli har doim: tax + instructor + platform === gross.
// Ya'ni yaxlitlashda birorta so'm yo'qolmaydi va ortib ham ketmaydi.

const PAYOUT_KEY = 'payout_config';

// Standart foizlar. Admin bularni sozlashi mumkin (SiteSetting -> payout_config).
const PAYOUT_DEFAULTS = {
  taxPct: 12, // soliq foizi
  organicInstructorPct: 40, // oddiy sotuvda ustoz ulushi (sof foydadan)
  referralInstructorPct: 60, // promo kod orqali sotuvda ustoz ulushi
  maxDiscountPct: 10, // ustoz belgilashi mumkin bo'lgan eng yuqori chegirma
};

// Foizni 0..100 oralig'iga keltiradi. Yaroqsiz qiymat uchun fallback.
function clampPct(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(100, Math.max(0, Math.round(n)));
}

// Saqlangan konfiguratsiyani standartlar bilan birlashtirib normallashtiradi.
function normalizePayoutConfig(cfg) {
  const c = cfg && typeof cfg === 'object' ? cfg : {};
  return {
    taxPct: clampPct(c.taxPct, PAYOUT_DEFAULTS.taxPct),
    organicInstructorPct: clampPct(c.organicInstructorPct, PAYOUT_DEFAULTS.organicInstructorPct),
    referralInstructorPct: clampPct(c.referralInstructorPct, PAYOUT_DEFAULTS.referralInstructorPct),
    maxDiscountPct: clampPct(c.maxDiscountPct, PAYOUT_DEFAULTS.maxDiscountPct),
  };
}

// Chegirmadan keyingi narx. discountPct 0..100.
// Yaxlitlash pastga emas, eng yaqin so'mga (o'quvchi foydasiga emas, adolatli).
function applyDiscount(price, discountPct) {
  const pct = clampPct(discountPct, 0);
  if (pct <= 0) return price;
  return Math.max(0, price - Math.round((price * pct) / 100));
}

// Bitta to'lovni taqsimlaydi.
//   gross   — haqiqatda to'langan summa (chegirmadan keyin), butun son (so'm)
//   source  — 'ORGANIC' | 'REFERRAL'
//   config  — normalizePayoutConfig natijasi
// Qaytaradi: { grossAmount, taxAmount, netAmount, instructorAmount, platformAmount, taxPct, sharePct, source }
function splitPayment(gross, source, config) {
  const cfg = normalizePayoutConfig(config);
  const grossAmount = Math.max(0, Math.round(Number(gross) || 0));
  const isReferral = source === 'REFERRAL';
  const sharePct = isReferral ? cfg.referralInstructorPct : cfg.organicInstructorPct;

  const taxAmount = Math.round((grossAmount * cfg.taxPct) / 100);
  const netAmount = grossAmount - taxAmount;
  const instructorAmount = Math.round((netAmount * sharePct) / 100);
  // Qoldiq — tizimga. Shu bilan yig'indi aniq gross'ga teng bo'ladi.
  const platformAmount = netAmount - instructorAmount;

  return {
    grossAmount,
    taxAmount,
    netAmount,
    instructorAmount,
    platformAmount,
    taxPct: cfg.taxPct,
    sharePct,
    source: isReferral ? 'REFERRAL' : 'ORGANIC',
  };
}

module.exports = {
  PAYOUT_KEY,
  PAYOUT_DEFAULTS,
  clampPct,
  normalizePayoutConfig,
  applyDiscount,
  splitPayment,
};
