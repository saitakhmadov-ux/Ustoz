// Sayt sozlamalari controlleri — hozircha bosh sahifa hero rasmlari
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const {
  getHeroConfig,
  getSetting,
  setSetting,
  HERO_KEY,
  HERO_MAX_IMAGES,
  HERO_MIN_INTERVAL,
  HERO_MAX_INTERVAL,
  HERO_DEFAULT_INTERVAL,
  CONTENT_KEY,
  CONTENT_FIELDS,
  CONTENT_MAX_LEN,
  getContentConfig,
  ABOUT_KEY,
  ABOUT_ICONS,
  normalizeAboutConfig,
  getAboutConfig,
  CONTACT_KEY,
  CONTACT_ICONS,
  normalizeContactConfig,
  getContactConfig,
} = require('../utils/settings');

// GET /api/home/hero (ommaviy) va GET /api/admin/hero (bosh admin)
// Bosh sahifa hero rasmlari va almashish intervali.
const getHero = asyncHandler(async (req, res) => {
  const hero = await getHeroConfig();
  res.json({ success: true, hero });
});

// PUT /api/admin/hero — hero rasmlari ro'yxati va intervalni saqlash
// Body: { images: string[] (max 5, /uploads/... yoki http URL), intervalSec: number }
const updateHero = asyncHandler(async (req, res) => {
  const { images, intervalSec } = req.body;

  if (!Array.isArray(images)) {
    throw ApiError.badRequest("images maydoni massiv bo'lishi kerak");
  }

  const cleaned = images
    .filter((u) => typeof u === 'string' && u.trim())
    .map((u) => u.trim())
    .slice(0, HERO_MAX_IMAGES);

  let sec = parseInt(intervalSec, 10);
  if (!Number.isFinite(sec)) sec = HERO_DEFAULT_INTERVAL;
  sec = Math.min(HERO_MAX_INTERVAL, Math.max(HERO_MIN_INTERVAL, sec));

  await setSetting(HERO_KEY, { images: cleaned, intervalSec: sec });
  res.json({ success: true, hero: { images: cleaned, intervalSec: sec } });
});

// POST /api/admin/hero/upload — bitta rasm yuklaydi, URL qaytaradi
const uploadHeroImage = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('Rasm yuborilmadi');
  res.status(201).json({
    success: true,
    url: `/uploads/${req.file.filename}`,
    originalName: req.file.originalname,
  });
});

// GET /api/home/content (ommaviy) va GET /api/admin/content (bosh admin)
// Bosh sahifadagi tahrirlanadigan matnlar (hero, CTA, footer).
const getContent = asyncHandler(async (req, res) => {
  const content = await getContentConfig();
  res.json({ success: true, content });
});

// PUT /api/admin/content — matnlarni saqlash (faqat bosh admin)
// Body: { heroTitle?, heroSubtitle?, ctaTitle?, ctaSubtitle?, footerText? }
const updateContent = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const existing = (await getSetting(CONTENT_KEY, {})) || {};
  const merged = { ...existing };

  for (const f of CONTENT_FIELDS) {
    if (body[f] === undefined) continue;
    if (typeof body[f] !== 'string') {
      throw ApiError.badRequest(`${f} matn bo'lishi kerak`);
    }
    merged[f] = body[f].trim().slice(0, CONTENT_MAX_LEN);
  }

  await setSetting(CONTENT_KEY, merged);
  const content = await getContentConfig();
  res.json({ success: true, content });
});

// GET /api/home/about (ommaviy) va GET /api/admin/about (bosh admin)
// "Biz haqimizda" sahifasining to'liq mazmuni.
const getAbout = asyncHandler(async (req, res) => {
  const about = await getAboutConfig();
  res.json({ success: true, about, icons: ABOUT_ICONS });
});

// PUT /api/admin/about — sahifa mazmunini to'liq almashtiradi.
// Body: { title, subtitle, video:{url,title,caption}, values:[], mission:{}, sections:[] }
// Normalizatsiya qiymatlarni kesadi va ruxsat etilmagan ikonkani almashtiradi,
// shuning uchun mijozdan kelgan ma'lumotga ishonilmaydi.
const updateAbout = asyncHandler(async (req, res) => {
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw ApiError.badRequest("Ma'lumot obyekt ko'rinishida bo'lishi kerak");
  }
  const normalized = normalizeAboutConfig(body);
  await setSetting(ABOUT_KEY, normalized);
  res.json({ success: true, about: normalized, message: 'Saqlandi' });
});

// GET /api/home/contact (ommaviy) va GET /api/admin/contact (bosh admin)
// "Kontaktlar" sahifasining to'liq mazmuni.
const getContact = asyncHandler(async (req, res) => {
  const contact = await getContactConfig();
  res.json({ success: true, contact, icons: CONTACT_ICONS });
});

// PUT /api/admin/contact — sahifa mazmunini to'liq almashtiradi.
// Body: { title, subtitle, items:[{icon,label,value,url}], workHours, mapUrl, formEnabled, formNote }
// Normalizatsiya havolalarni tekshiradi va ruxsat etilmagan ikonkani almashtiradi.
const updateContact = asyncHandler(async (req, res) => {
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw ApiError.badRequest("Ma'lumot obyekt ko'rinishida bo'lishi kerak");
  }
  const normalized = normalizeContactConfig(body);
  await setSetting(CONTACT_KEY, normalized);
  res.json({ success: true, contact: normalized, message: 'Saqlandi' });
});

module.exports = {
  getHero,
  updateHero,
  uploadHeroImage,
  getContent,
  updateContent,
  getAbout,
  updateAbout,
  getContact,
  updateContact,
};
