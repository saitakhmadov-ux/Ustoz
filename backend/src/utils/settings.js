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

// ---- "Biz haqimizda" sahifasi ----
// Sahifa to'liq admin panelidan boshqariladi: sarlavha, video, qadriyat
// kartochkalari, missiya bloki va cheksiz qo'shimcha bo'limlar.
const ABOUT_KEY = 'about_page';
const ABOUT_MAX_LEN = 4000;
const ABOUT_MAX_VALUES = 9;
const ABOUT_MAX_SECTIONS = 12;
// Admin tanlay oladigan ikonkalar — frontendda shu nomlar lucide ikonkasiga moslanadi
const ABOUT_ICONS = [
  'Target', 'Heart', 'Users', 'GraduationCap', 'BookOpen', 'Award',
  'Rocket', 'Star', 'Shield', 'Globe', 'Lightbulb', 'TrendingUp',
];

// Admin hech narsa saqlamagunicha ko'rinadigan standart mazmun
function aboutDefaults() {
  return {
    title: 'Biz haqimizda',
    subtitle: "Ustoz — o'zbek yoshlarini zamonaviy IT kasblariga tayyorlaydigan onlayn ta'lim "
      + "platformasi. Bizning maqsadimiz — sifatli ta'limni har bir insonga yetkazish.",
    video: { url: '', title: '', caption: '' },
    values: [
      { id: 'v1', icon: 'Target', title: 'Amaliy bilim', text: 'Har bir kurs real loyihalar va amaliy topshiriqlarga asoslangan.' },
      { id: 'v2', icon: 'Heart', title: "O'zbek tilida", text: 'Barcha materiallar ona tilimizda, tushunarli va sifatli tayyorlangan.' },
      { id: 'v3', icon: 'Users', title: 'Hamjamiyat', text: "Tajribali murabbiylar va faol o'quvchilar hamjamiyati." },
    ],
    mission: {
      title: 'Bizning missiyamiz',
      text: "Har bir o'zbekistonlik yoshga geografik joylashuvidan qat'i nazar, jahon darajasidagi "
        + "IT ta'limni qulay narxda yetkazish va ularni raqamli kelajakka tayyorlash.",
    },
    sections: [],
  };
}

const aboutStr = (v, max = ABOUT_MAX_LEN) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

// Saqlangan qiymatni xavfsiz ko'rinishga keltiradi.
// Sarlavha/matn bo'sh bo'lsa standart ishlatiladi; ro'yxatlar esa aynan
// saqlangan holicha qoladi — admin hamma kartochkani o'chirsa, bo'sh qoladi.
function normalizeAboutConfig(cfg) {
  const d = aboutDefaults();
  if (!cfg || typeof cfg !== 'object') return d;

  const values = Array.isArray(cfg.values)
    ? cfg.values
      .slice(0, ABOUT_MAX_VALUES)
      .map((v, i) => ({
        id: aboutStr(v && v.id, 40) || `v${i + 1}`,
        icon: ABOUT_ICONS.includes(v && v.icon) ? v.icon : ABOUT_ICONS[0],
        title: aboutStr(v && v.title, 120),
        text: aboutStr(v && v.text, 600),
      }))
      .filter((v) => v.title || v.text)
    : d.values;

  const sections = Array.isArray(cfg.sections)
    ? cfg.sections
      .slice(0, ABOUT_MAX_SECTIONS)
      .map((s, i) => ({
        id: aboutStr(s && s.id, 40) || `s${i + 1}`,
        title: aboutStr(s && s.title, 160),
        text: aboutStr(s && s.text),
        image: aboutStr(s && s.image, 500),
      }))
      .filter((s) => s.title || s.text || s.image)
    : [];

  return {
    title: aboutStr(cfg.title, 160) || d.title,
    subtitle: aboutStr(cfg.subtitle) || d.subtitle,
    video: {
      url: aboutStr(cfg.video && cfg.video.url, 500),
      title: aboutStr(cfg.video && cfg.video.title, 160),
      caption: aboutStr(cfg.video && cfg.video.caption, 600),
    },
    values,
    mission: {
      title: aboutStr(cfg.mission && cfg.mission.title, 160),
      text: aboutStr(cfg.mission && cfg.mission.text),
    },
    sections,
  };
}

async function getAboutConfig() {
  return normalizeAboutConfig(await getSetting(ABOUT_KEY, null));
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
  ABOUT_KEY,
  ABOUT_ICONS,
  ABOUT_MAX_VALUES,
  ABOUT_MAX_SECTIONS,
  aboutDefaults,
  normalizeAboutConfig,
  getAboutConfig,
  AI_CONFIG_KEY,
  AI_DEFAULT_MODEL,
  AI_MAX_INSTRUCTIONS,
  getAiConfig,
};
