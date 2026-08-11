// Tizim sozlamalari — email (SMTP) va bot himoyasi (Turnstile).
// Maqsad: domen/pochta yoki CAPTCHA kalitini almashtirish uchun qayta deploy
// qilish shart bo'lmasin. Panel qiymatlari .env dan ustun turadi.
//
// Yozuv yo'nalishlari faqat bosh admin uchun (admin.routes'da adminOnly).
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const prisma = require('../config/prisma');
const { sendTestMail, verifyTransport } = require('../utils/mailer');
const bot = require('../telegram/bot');
const {
  getSetting, setSetting,
  EMAIL_CONFIG_KEY, EMAIL_MAX_LEN, safePort, getEmailConfig,
  TELEGRAM_CONFIG_KEY, getTelegramConfig,
  SECURITY_KEY, getSecurityConfig,
} = require('../utils/settings');

// Maxfiy qiymatni niqoblab ko'rsatadi — panel to'liq parolni hech qachon olmaydi
function maskSecret(value) {
  if (!value) return '';
  if (value.length <= 6) return '••••';
  return `${value.slice(0, 2)}••••${value.slice(-2)}`;
}

// Panelga qaytariladigan ko'rinish (parol niqoblangan)
function emailView(cfg) {
  return {
    mock: cfg.mock,
    from: cfg.from,
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    user: cfg.user,
    passSet: Boolean(cfg.pass),
    passPreview: maskSecret(cfg.pass),
    source: cfg.source, // 'db' | 'env' | 'none'
  };
}

// Niqob qaytib kelgan bo'lsa (foydalanuvchi maydonga tegmagan) — e'tiborsiz qoldiramiz
const isMasked = (v) => typeof v === 'string' && v.includes('••');

// GET /api/admin/email — joriy email sozlamalari
const getEmail = asyncHandler(async (req, res) => {
  res.json({ success: true, config: emailView(await getEmailConfig()) });
});

// PUT /api/admin/email — sozlamalarni saqlash
// Body: { mock?, from?, host?, port?, secure?, user?, pass? }
// host bo'sh qoldirilsa panel sozlamasi o'chadi va .env qiymatlari qaytadi.
// pass bo'sh/niqoblangan bo'lsa mavjud parol o'zgarmaydi.
const updateEmail = asyncHandler(async (req, res) => {
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw ApiError.badRequest("Ma'lumot obyekt ko'rinishida bo'lishi kerak");
  }

  const existing = (await getSetting(EMAIL_CONFIG_KEY, {})) || {};
  const next = { ...existing };

  if (body.mock !== undefined) {
    if (typeof body.mock !== 'boolean') throw ApiError.badRequest("mock qiymati true/false bo'lishi kerak");
    next.mock = body.mock;
  }
  if (body.secure !== undefined) {
    if (typeof body.secure !== 'boolean') throw ApiError.badRequest("secure qiymati true/false bo'lishi kerak");
    next.secure = body.secure;
  }
  for (const field of ['from', 'host', 'user']) {
    if (body[field] === undefined) continue;
    if (typeof body[field] !== 'string') throw ApiError.badRequest(`${field} matn bo'lishi kerak`);
    next[field] = body[field].trim().slice(0, EMAIL_MAX_LEN);
  }
  if (body.port !== undefined) {
    const port = safePort(body.port, null);
    if (port === null) throw ApiError.badRequest("Port 1 dan 65535 gacha son bo'lishi kerak");
    next.port = port;
  }
  if (typeof body.pass === 'string' && body.pass && !isMasked(body.pass)) {
    next.pass = body.pass;
  }

  // Panel sozlamasi to'liq o'chirilsa parol ham qolmasin
  if (next.host === '') next.pass = '';

  await setSetting(EMAIL_CONFIG_KEY, next);
  res.json({ success: true, config: emailView(await getEmailConfig()), message: 'Saqlandi' });
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Eng ko'p uchraydigan SMTP xatolarini tushunarli tilga o'giradi
function explain(message) {
  const m = String(message || '');
  if (/Invalid login|535|BadCredentials/i.test(m)) {
    return 'Login yoki parol qabul qilinmadi. Gmail uchun oddiy parol emas, '
      + '16 belgili "App password" kerak (akkauntda 2 bosqichli tasdiqlash yoqilgan bo\'lishi shart).';
  }
  if (/ETIMEDOUT|ECONNREFUSED|ENOTFOUND/i.test(m)) {
    return 'Serverga ulanib bo\'lmadi. Server manzili va portni tekshiring '
      + '(Gmail: smtp.gmail.com, 587 + SSL o\'chiq yoki 465 + SSL yoqiq).';
  }
  if (/self signed|certificate/i.test(m)) {
    return 'Sertifikat muammosi — SSL belgisi tanlangan portga mos emasga o\'xshaydi.';
  }
  return null;
}

// POST /api/admin/email/test — ulanishni tekshirib, sinov xati yuboradi.
// Mock rejim yoqiq bo'lsa ham ishlaydi: sozlamani yoqishdan oldin sinash uchun.
// Body: { to }
const testEmail = asyncHandler(async (req, res) => {
  const to = typeof req.body?.to === 'string' ? req.body.to.trim() : '';
  if (!EMAIL_RE.test(to)) throw ApiError.badRequest("To'g'ri email manzil kiriting");

  const cfg = await getEmailConfig();
  if (!cfg.host) {
    return res.json({ success: false, error: 'SMTP server ko\'rsatilmagan. Avval sozlamalarni to\'ldirib saqlang.' });
  }

  const check = await verifyTransport({ ignoreMock: true });
  if (!check.ok) {
    const error = check.error || check.reason;
    return res.json({ success: false, step: 'ulanish', error, hint: explain(error) });
  }

  const sent = await sendTestMail(to);
  if (!sent.sent) {
    return res.json({ success: false, step: 'yuborish', error: sent.error, hint: explain(sent.error) });
  }

  res.json({
    success: true,
    to,
    from: sent.from,
    message: cfg.mock
      ? 'Sinov xati yuborildi. Diqqat: mock rejim hali yoqilgan — haqiqiy xatlar chiqmaydi.'
      : 'Sinov xati yuborildi. Pochtangizni (Spam papkasini ham) tekshiring.',
  });
});

// ---- Telegram bot ----

// Panelga qaytariladigan ko'rinish (token niqoblangan) + jonli holat
async function telegramView() {
  const cfg = await getTelegramConfig();
  const linkedCount = await prisma.user.count({ where: { telegramChatId: { not: null } } });
  return {
    tokenSet: Boolean(cfg.token),
    tokenPreview: maskSecret(cfg.token),
    enabled: cfg.enabled,
    botUsername: cfg.botUsername,
    source: cfg.source,
    linkedCount, // nechta foydalanuvchi hisobini ulagan
    status: bot.getStatus(),
  };
}

// GET /api/admin/telegram
const getTelegram = asyncHandler(async (req, res) => {
  res.json({ success: true, config: await telegramView() });
});

// PUT /api/admin/telegram — token/yoqilganlikni saqlaydi va botni qayta ishga tushiradi.
// Body: { token?, enabled? } — token bo'sh/niqoblangan bo'lsa o'zgarmaydi.
const updateTelegram = asyncHandler(async (req, res) => {
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw ApiError.badRequest("Ma'lumot obyekt ko'rinishida bo'lishi kerak");
  }

  const existing = (await getSetting(TELEGRAM_CONFIG_KEY, {})) || {};
  const next = { ...existing };

  if (body.enabled !== undefined) {
    if (typeof body.enabled !== 'boolean') throw ApiError.badRequest("enabled qiymati true/false bo'lishi kerak");
    next.enabled = body.enabled;
  }
  if (typeof body.token === 'string' && !isMasked(body.token)) {
    const token = body.token.trim();
    // Bo'sh matn — tokenni ataylab o'chirish
    next.token = token;
    // Boshqa botga o'tilsa eski nom va webhook kaliti yaroqsiz bo'ladi
    if (token !== existing.token) {
      next.botUsername = '';
      next.webhookSecret = '';
    }
  }

  await setSetting(TELEGRAM_CONFIG_KEY, next);
  // Yangi sozlama darrov kuchga kirsin — server qayta ishga tushirilmaydi
  await bot.restartBot();

  res.json({ success: true, config: await telegramView(), message: 'Saqlandi' });
});

// POST /api/admin/telegram/test — adminning o'z Telegramiga sinov xabari.
// Bot faqat ulangan hisobga yozadi, shuning uchun admin avval o'zini ulaydi.
const testTelegram = asyncHandler(async (req, res) => {
  const status = bot.getStatus();
  if (!status.running) {
    const reasons = {
      'no-token': 'Bot tokeni qo\'yilmagan.',
      disabled: 'Bot o\'chirilgan.',
      error: `Bot ishga tushmagan: ${status.error || 'noma\'lum xato'}`,
    };
    return res.json({ success: false, error: reasons[status.reason] || 'Bot ishlamayapti.' });
  }

  const me = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!me.telegramChatId) {
    return res.json({
      success: false,
      error: 'Avval o\'z hisobingizni botga ulang: Profil → "Telegram\'ga ulash".',
    });
  }

  const sent = await bot.sendMessage(
    me.telegramChatId,
    '✅ <b>Sinov xabari</b>\n\nUstoz boti to\'g\'ri sozlangan — xabarlar shu yerga keladi.',
  );
  if (!sent.sent) return res.json({ success: false, error: sent.error });

  res.json({ success: true, message: 'Sinov xabari Telegram\'ga yuborildi.' });
});

// Panelga qaytariladigan xavfsizlik ko'rinishi (maxfiy kalit niqoblangan)
function securityView(cfg) {
  return {
    siteKey: cfg.siteKey,
    secretSet: Boolean(cfg.secretKey),
    secretPreview: maskSecret(cfg.secretKey),
    source: cfg.source,
    // Ikkala kalit ham bo'lmasa CAPTCHA butunlay o'chiq
    active: Boolean(cfg.siteKey && cfg.secretKey),
  };
}

// GET /api/admin/security — Turnstile kalitlari holati
const getSecurity = asyncHandler(async (req, res) => {
  res.json({ success: true, config: securityView(await getSecurityConfig()) });
});

// PUT /api/admin/security — kalitlarni saqlash
// Body: { siteKey?, secretKey? } — secretKey bo'sh/niqoblangan bo'lsa o'zgarmaydi
const updateSecurity = asyncHandler(async (req, res) => {
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw ApiError.badRequest("Ma'lumot obyekt ko'rinishida bo'lishi kerak");
  }

  const existing = (await getSetting(SECURITY_KEY, {})) || {};
  const next = { ...existing };

  if (body.siteKey !== undefined) {
    if (typeof body.siteKey !== 'string') throw ApiError.badRequest("siteKey matn bo'lishi kerak");
    next.siteKey = body.siteKey.trim().slice(0, EMAIL_MAX_LEN);
  }
  if (typeof body.secretKey === 'string' && !isMasked(body.secretKey)) {
    // Bo'sh matn — kalitni ataylab o'chirish
    next.secretKey = body.secretKey.trim().slice(0, EMAIL_MAX_LEN);
  }

  await setSetting(SECURITY_KEY, next);
  res.json({ success: true, config: securityView(await getSecurityConfig()), message: 'Saqlandi' });
});

// GET /api/home/security (ommaviy) — brauzerga faqat ommaviy kalit beriladi.
// Sayt CAPTCHA vidjetini shu javob asosida ko'rsatadi.
const publicSecurity = asyncHandler(async (req, res) => {
  const { siteKey } = await getSecurityConfig();
  res.json({ success: true, security: { siteKey } });
});

module.exports = {
  getEmail, updateEmail, testEmail,
  getTelegram, updateTelegram, testTelegram,
  getSecurity, updateSecurity, publicSecurity,
};
