// Telegram Mini App (WebApp) `initData` imzosini tekshirish.
//
// Telegram Mini App'ni ochganda sahifaga `initData` qatorini beradi va uni BOT
// TOKENI bilan imzolaydi. Server shu imzoni qayta hisoblab solishtiradi — mos
// kelsa, ma'lumot haqiqatan Telegram'dan kelgan va o'zgartirilmagan bo'ladi.
// Ya'ni foydalanuvchi o'zini boshqa Telegram akkaunt qilib ko'rsata olmaydi.
//
// Algoritm (Telegram hujjatidagidek):
//   1. `hash` ni ajratib olamiz, qolgan juftliklarni "kalit=qiymat" ko'rinishida
//      kalit bo'yicha saralab, "\n" bilan birlashtiramiz (data_check_string).
//   2. secret = HMAC_SHA256(kalit: "WebAppData", ma'lumot: bot_token)
//   3. HMAC_SHA256(kalit: secret, ma'lumot: data_check_string) == hash bo'lishi kerak.
//
// Qo'shimcha: `auth_date` eski bo'lsa rad etamiz — sizib chiqqan eski initData
// qayta ishlatilmasin.
const crypto = require('crypto');

const MAX_AGE_SEC = 15 * 60; // initData shuncha vaqt amal qiladi

// Ikki hex qatorni vaqtga bog'liq bo'lmagan tarzda solishtiradi
function safeEqualHex(a, b) {
  const bufA = Buffer.from(String(a || ''), 'hex');
  const bufB = Buffer.from(String(b || ''), 'hex');
  if (bufA.length === 0 || bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

// initData ni tekshiradi.
// Qaytaradi: { ok: true, user, authDate } yoki { ok: false, reason }
//   reason: 'empty' | 'no-token' | 'no-hash' | 'bad-signature' | 'expired' | 'no-user'
function verifyInitData(initData, botToken, { maxAgeSec = MAX_AGE_SEC } = {}) {
  if (!initData || typeof initData !== 'string') return { ok: false, reason: 'empty' };
  if (!botToken) return { ok: false, reason: 'no-token' };

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return { ok: false, reason: 'no-hash' };

  const dataCheckString = [...params.entries()]
    .filter(([key]) => key !== 'hash')
    .map(([key, value]) => `${key}=${value}`)
    .sort()
    .join('\n');

  const secret = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const computed = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex');
  if (!safeEqualHex(computed, hash)) return { ok: false, reason: 'bad-signature' };

  // Imzo to'g'ri — endi yangiligini tekshiramiz
  const authDate = Number(params.get('auth_date'));
  if (!Number.isFinite(authDate)) return { ok: false, reason: 'expired' };
  const ageSec = Math.floor(Date.now() / 1000) - authDate;
  if (ageSec > maxAgeSec || ageSec < -60) return { ok: false, reason: 'expired' };

  let user;
  try {
    user = JSON.parse(params.get('user') || 'null');
  } catch {
    user = null;
  }
  if (!user || !user.id) return { ok: false, reason: 'no-user' };

  return { ok: true, user, authDate: new Date(authDate * 1000) };
}

// Xato sababini foydalanuvchiga tushunarli matnga aylantiradi
function initDataErrorMessage(reason) {
  if (reason === 'no-token') return 'Telegram bot hozircha sozlanmagan.';
  if (reason === 'expired') return 'Ulash oynasi eskirgan. Botda tugmani qaytadan bosing.';
  if (reason === 'empty' || reason === 'no-user') {
    return 'Bu sahifa Telegram ilovasi ichida ochilishi kerak. Botdagi "Hisobni ulash" tugmasini bosing.';
  }
  return 'Telegram ma\'lumoti tasdiqlanmadi. Botda tugmani qaytadan bosing.';
}

module.exports = { verifyInitData, initDataErrorMessage, MAX_AGE_SEC };
