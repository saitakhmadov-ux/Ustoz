// Formani odam to'ldirganini tekshirish — uch qatlam:
//   1) Cloudflare Turnstile (asosiy himoya, bepul va cheksiz)
//   2) honeypot maydon — ekranda ko'rinmaydi, botlar to'ldiradi
//   3) forma to'ldirish vaqti — 1.5 soniyadan tez yuborilsa odam emas
//
// 2 va 3 yordamchi qatlamlar: ular faqat aniq bot belgisi bo'lgandagina
// rad etadi, aks holda o'tkazib yuboradi (eski mijozni buzmaslik uchun).
const env = require('../config/env');
const ApiError = require('./ApiError');
const { getSecurityConfig } = require('./settings');

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const MIN_FORM_MS = 1500;

let warned = false;

// Turnstile tokenini Cloudflare'da tekshiradi.
// Maxfiy kalit admin panelidan (yoki .env dan) olinadi — qo'yilmagan bo'lsa
// tekshiruv o'tkazib yuboriladi.
// Qaytaradi: { ok, skipped?, reason? }
async function verifyTurnstile(token, ip) {
  const { secretKey } = await getSecurityConfig();

  if (!secretKey) {
    if (!warned && env.nodeEnv === 'production') {
      warned = true;
      console.warn('⚠️  Turnstile maxfiy kaliti qo\'yilmagan — CAPTCHA tekshiruvi o\'chirilgan!'
        + ' Admin panel → Email va himoya bo\'limida kalitni qo\'ying.');
    }
    return { ok: true, skipped: true };
  }
  if (!token) return { ok: false, reason: 'missing' };

  try {
    const body = new URLSearchParams({ secret: secretKey, response: token });
    if (ip) body.set('remoteip', ip);

    const res = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json();
    return data.success ? { ok: true } : { ok: false, reason: (data['error-codes'] || []).join(',') };
  } catch (err) {
    // Cloudflare javob bermasa foydalanuvchini bloklab qo'ymaymiz —
    // qolgan qatlamlar (rate limit, honeypot) baribir ishlaydi.
    console.error('Turnstile tekshiruvida xatolik:', err.message);
    return { ok: true, degraded: true };
  }
}

// Barcha qatlamlarni tekshiradi. Bot deb topilsa xato tashlaydi.
// req.body dan kutiladi: captchaToken, website (honeypot), formMs (raqam)
async function assertHuman(req) {
  const { captchaToken, website, formMs } = req.body || {};

  // Honeypot: ko'rinmas maydon to'ldirilgan bo'lsa — bot.
  // Odamga tushunarli xato bermaymiz, chunki xabar bot uchun ko'rsatma bo'ladi.
  if (typeof website === 'string' && website.trim() !== '') {
    throw ApiError.badRequest("So'rovni qayta yuboring");
  }

  // Forma juda tez to'ldirilgan bo'lsa
  const ms = Number(formMs);
  if (Number.isFinite(ms) && ms >= 0 && ms < MIN_FORM_MS) {
    throw ApiError.badRequest("So'rovni qayta yuboring");
  }

  const result = await verifyTurnstile(captchaToken, req.ip);
  if (!result.ok) {
    throw ApiError.badRequest('Tekshiruvdan o\'tilmadi. Sahifani yangilab, qayta urinib ko\'ring.');
  }
}

module.exports = { assertHuman, verifyTurnstile };
