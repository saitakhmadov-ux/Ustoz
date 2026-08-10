// Sayt sozlamalari uchun yordamchilar — SiteSetting jadvali (key/value, value ichida JSON)
const prisma = require('../config/prisma');

// Bitta sozlamani o'qish (JSON parse qilingan). Topilmasa fallback qaytadi.
async function getSetting(key, fallback = null) {
  const row = await prisma.siteSetting.findUnique({ where: { key } });
  if (!row) return fallback;
  try {
    return JSON.parse(row.value);
  } catch {
    return fallback;
  }
}

// Sozlamani yozish (upsert). value JSON ga aylantiriladi.
async function setSetting(key, value) {
  const str = JSON.stringify(value);
  return prisma.siteSetting.upsert({
    where: { key },
    create: { key, value: str },
    update: { value: str },
  });
}

// ---- Bosh sahifa hero rasmlari ----
const HERO_KEY = 'hero';
const HERO_MAX_IMAGES = 5;
const HERO_MIN_INTERVAL = 2; // soniya
const HERO_MAX_INTERVAL = 30;
const HERO_DEFAULT_INTERVAL = 5;

// Hero konfiguratsiyasini normallashtirib qaytaradi: { images: string[], intervalSec: number }
async function getHeroConfig() {
  const cfg = await getSetting(HERO_KEY, null);
  const images = Array.isArray(cfg && cfg.images)
    ? cfg.images.filter((u) => typeof u === 'string' && u.trim()).slice(0, HERO_MAX_IMAGES)
    : [];
  let sec = parseInt(cfg && cfg.intervalSec, 10);
  if (!Number.isFinite(sec)) sec = HERO_DEFAULT_INTERVAL;
  sec = Math.min(HERO_MAX_INTERVAL, Math.max(HERO_MIN_INTERVAL, sec));
  return { images, intervalSec: sec };
}

// ---- Bosh sahifa tahrirlanadigan matnlari ----
const CONTENT_KEY = 'home_content';
const CONTENT_FIELDS = ['heroTitle', 'heroSubtitle', 'ctaTitle', 'ctaSubtitle', 'footerText'];
const CONTENT_MAX_LEN = 2000;

// Standart (zaxira) matnlar — admin o'zgartirmaguncha shular ko'rsatiladi.
function contentDefaults() {
  const year = new Date().getFullYear();
  return {
    heroTitle: "Kelajak kasbini bugun o'rganing",
    heroSubtitle:
      "Frontend, Backend, Mobile va DevOps yo'nalishlarida amaliy kurslar — video darslar, testlar va sertifikat bilan mutaxassisga aylaning.",
    ctaTitle: 'Bilim — eng yaxshi sarmoya',
    ctaSubtitle:
      "Bugun ro'yxatdan o'ting va o'zingizga mos kursni tanlab, yangi kasbga yo'l oching.",
    footerText: `© ${year} Ustoz. Barcha huquqlar himoyalangan.`,
  };
}

// Saqlangan qiymatlarni standartlar bilan birlashtirib qaytaradi.
// Bo'sh yoki noto'g'ri maydonlar uchun standart ishlatiladi.
async function getContentConfig() {
  const cfg = await getSetting(CONTENT_KEY, null);
  const d = contentDefaults();
  if (!cfg || typeof cfg !== 'object') return d;
  const out = {};
  for (const k of CONTENT_FIELDS) {
    const v = cfg[k];
    out[k] = typeof v === 'string' && v.trim() ? v : d[k];
  }
  return out;
}

// ---- AI Ustoz (Gemini) sozlamalari ----
const AI_CONFIG_KEY = 'ai_config';
const AI_DEFAULT_MODEL = 'gemini-3.6-flash';
const AI_MAX_INSTRUCTIONS = 4000;

// AI konfiguratsiyasi. DB (SiteSetting) qiymatlari ustuvor; bo'lmasa .env zaxira.
// Qaytaradi: { apiKey, model, customInstructions, enabled, keySource }
async function getAiConfig() {
  const cfg = (await getSetting(AI_CONFIG_KEY, {})) || {};
  const dbKey = typeof cfg.apiKey === 'string' ? cfg.apiKey.trim() : '';
  const envKey = (process.env.GEMINI_API_KEY || '').trim();
  const apiKey = dbKey || envKey;
  const model = (typeof cfg.model === 'string' && cfg.model.trim())
    ? cfg.model.trim()
    : (process.env.GEMINI_MODEL || AI_DEFAULT_MODEL);
  const customInstructions = typeof cfg.customInstructions === 'string'
    ? cfg.customInstructions.slice(0, AI_MAX_INSTRUCTIONS)
    : '';
  const enabled = cfg.enabled !== false; // standart: yoqilgan
  const keySource = dbKey ? 'db' : (envKey ? 'env' : 'none');
  return { apiKey, model, customInstructions, enabled, keySource };
}

// ---- Ustoz maoshi (soliq va ulush foizlari) ----
const { PAYOUT_KEY, normalizePayoutConfig } = require('./earnings');

// Maosh taqsimoti sozlamalari. Saqlanmagan bo'lsa standart qiymatlar qaytadi.
// Qaytaradi: { taxPct, organicInstructorPct, referralInstructorPct, maxDiscountPct }
async function getPayoutConfig() {
  return normalizePayoutConfig(await getSetting(PAYOUT_KEY, null));
}

module.exports = {
  getSetting,
  setSetting,
  PAYOUT_KEY,
  getPayoutConfig,
  getHeroConfig,
  HERO_KEY,
  HERO_MAX_IMAGES,
  HERO_MIN_INTERVAL,
  HERO_MAX_INTERVAL,
  HERO_DEFAULT_INTERVAL,
  CONTENT_KEY,
  CONTENT_FIELDS,
  CONTENT_MAX_LEN,
  contentDefaults,
  getContentConfig,
  AI_CONFIG_KEY,
  AI_DEFAULT_MODEL,
  AI_MAX_INSTRUCTIONS,
  getAiConfig,
};
