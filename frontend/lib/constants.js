// Umumiy konstantalar va yorliqlar (O'zbek tili)

export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || 'Ustoz';

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Fayllar (yuklangan video/PDF) uchun asos manzil — /api qismisiz
export const FILE_BASE_URL = API_URL.replace(/\/api\/?$/, '');

// Nisbiy fayl yo'lini (/uploads/...) to'liq URL ga aylantiradi.
// Tashqi (http...) havolalar o'zgarmaydi.
export function fileUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return `${FILE_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}

// Kurs darajalari
export const LEVELS = {
  BEGINNER: 'Boshlang\'ich',
  INTERMEDIATE: 'O\'rta',
  ADVANCED: 'Yuqori',
};

// Qiyinchilik darajasiga qarab kursdan foydalanish muddati (oylarda).
// Backend bilan mos: BEGINNER 1 oy, INTERMEDIATE 2 oy, ADVANCED 3 oy.
export const ACCESS_MONTHS = {
  BEGINNER: 1,
  INTERMEDIATE: 2,
  ADVANCED: 3,
};

export function accessMonths(level) {
  return ACCESS_MONTHS[level] ?? 1;
}

export function accessMonthsLabel(level) {
  return `${accessMonths(level)} oy`;
}

// Kursning amaldagi muddati (oy): kursda aniq belgilangan bo'lsa o'sha, aks holda daraja standarti.
export function courseAccessMonths(course) {
  if (course && Number.isInteger(course.accessMonths) && course.accessMonths > 0) {
    return course.accessMonths;
  }
  return accessMonths(course && course.level);
}

export function courseAccessMonthsLabel(course) {
  return `${courseAccessMonths(course)} oy`;
}

// Backenddan kelgan access obyektidan ko'rsatkich yasaydi.
// access = { staff?, expiresAt, expired, daysLeft, ratioLeft }
// Rang qolgan vaqtning umumiy muddatga NISBATiga bog'liq:
//   nisbat > 0.5 (boshi)      => yashil (ok)
//   nisbat 0.2..0.5 (yarmi)   => sabzi/orange (amber)
//   nisbat <= 0.2 (oxiri)     => qizil (red)
// ratioLeft bo'lmasa (eski ma'lumot) kun-chegaraga qaytadi.
export function formatDaysLeft(access) {
  if (!access || access.staff || access.expiresAt == null) return null;
  if (access.expired) return { expired: true, days: 0, label: 'Muddat tugagan', tone: 'red' };
  const d = access.daysLeft ?? 0;
  const r = access.ratioLeft;
  let tone = 'ok';
  if (r != null) {
    if (r > 0.5) tone = 'ok';
    else if (r > 0.2) tone = 'amber';
    else tone = 'red';
  } else if (d <= 3) {
    tone = 'red';
  } else if (d <= 7) {
    tone = 'amber';
  }
  return { expired: false, days: d, label: d === 1 ? '1 kun qoldi' : `${d} kun qoldi`, tone };
}

// To'lov provayderlari
export const PAYMENT_PROVIDERS = {
  CLICK: 'Click',
  PAYME: 'Payme',
};

// To'lov holatlari
export const PAYMENT_STATUS = {
  PENDING: 'Kutilmoqda',
  PAID: 'To\'langan',
  FAILED: 'Muvaffaqiyatsiz',
};

// Narxni formatlash (so'm)
export function formatPrice(amount, isFree) {
  if (isFree || !amount) return 'Bepul';
  return new Intl.NumberFormat('uz-UZ').format(amount) + ' so\'m';
}
