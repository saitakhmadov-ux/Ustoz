// Umumiy konstantalar va yorliqlar (Oʻzbek tili)

export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || 'Ustoz';

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Fayllar (yuklangan video/PDF) uchun asos manzil — /api qismisiz
export const FILE_BASE_URL = API_URL.replace(/\/api\/?$/, '');

// Nisbiy fayl yoʻlini (/uploads/...) toʻliq URL ga aylantiradi.
// Tashqi (http...) havolalar oʻzgarmaydi.
export function fileUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return `${FILE_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}

// Oylarning oʻzbekcha nomlari.
// Brauzerlarning `uz-UZ` lokali toʻliq emas: `toLocaleDateString('uz-UZ',
// { month: 'long' })` Chromeʼda "M07" kabi chiqadi. Sertifikat va shunga
// oʻxshash koʻzga koʻrinadigan joylarda oy nomi qoʻlda yoziladi.
const MONTHS_UZ = [
  'yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun',
  'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr',
];

// "31-iyul, 2026" koʻrinishidagi toʻliq sana
export function formatDateUz(value) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getDate()}-${MONTHS_UZ[d.getMonth()]}, ${d.getFullYear()}`;
}

// Yuklanadigan fayl hajmi chegaralari (MB).
// Backend bilan mos boʻlishi shart — backend/src/middleware/upload.js -> SIZE_LIMITS.
// PDF materiallar hosting joyini tez toʻldirmasligi uchun 2MB bilan cheklangan.
export const MAX_PDF_MB = 2;
export const MAX_VIDEO_MB = 500;

// Fayl hajmini oʻqishga qulay koʻrinishga oʻtkazadi: 1.4 MB, 820 KB
export function formatFileSize(bytes) {
  const n = Number(bytes) || 0;
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(n / 1024))} KB`;
}

// Kurs darajalari
export const LEVELS = {
  BEGINNER: 'Boshlangʻich',
  INTERMEDIATE: 'Oʻrta',
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

// Kursning amaldagi muddati (oy): kursda aniq belgilangan boʻlsa oʻsha, aks holda daraja standarti.
export function courseAccessMonths(course) {
  if (course && Number.isInteger(course.accessMonths) && course.accessMonths > 0) {
    return course.accessMonths;
  }
  return accessMonths(course && course.level);
}

export function courseAccessMonthsLabel(course) {
  return `${courseAccessMonths(course)} oy`;
}

// Backenddan kelgan access obyektidan koʻrsatkich yasaydi.
// access = { staff?, expiresAt, expired, daysLeft, ratioLeft }
// Rang qolgan vaqtning umumiy muddatga NISBATiga bogʻliq:
//   nisbat > 0.5 (boshi)      => yashil (ok)
//   nisbat 0.2..0.5 (yarmi)   => sabzi/orange (amber)
//   nisbat <= 0.2 (oxiri)     => qizil (red)
// ratioLeft boʻlmasa (eski maʼlumot) kun-chegaraga qaytadi.
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

// Toʻlov provayderlari
export const PAYMENT_PROVIDERS = {
  CLICK: 'Click',
  PAYME: 'Payme',
};

// Toʻlov holatlari
export const PAYMENT_STATUS = {
  PENDING: 'Kutilmoqda',
  PAID: 'Toʻlangan',
  FAILED: 'Muvaffaqiyatsiz',
};

// Narxni formatlash (soʻm). Kurs narxi uchun — 0 boʻlsa "Bepul".
export function formatPrice(amount, isFree) {
  if (isFree || !amount) return 'Bepul';
  return new Intl.NumberFormat('uz-UZ').format(amount) + ' soʻm';
}

// Hisobotlar uchun summa formatlash. Narxdan farqi: 0 ham "0 soʻm" boʻlib
// koʻrinadi ("Bepul" emas) va manfiy qiymat toʻgʻri chiqadi — maosh,
// soliq va oʻtkazma jadvallarida shu ishlatiladi.
export function formatMoney(amount) {
  const n = Number(amount) || 0;
  return new Intl.NumberFormat('uz-UZ').format(n) + ' soʻm';
}
