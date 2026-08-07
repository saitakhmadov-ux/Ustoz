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

module.exports = { getHero, updateHero, uploadHeroImage, getContent, updateContent };
