// Muhit o'zgaruvchilarini yuklash va tekshirish
require('dotenv').config();

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Muhit o'zgaruvchisi topilmadi: ${name}. .env faylini tekshiring.`);
  }
  return value;
}

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  databaseUrl: required('DATABASE_URL'),
  jwt: {
    secret: required('JWT_SECRET', 'dev_maxfiy_kalit'),
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@ustoz.uz',
    password: process.env.ADMIN_PASSWORD || 'admin12345',
    name: process.env.ADMIN_NAME || 'Bosh Admin',
  },
  paymentMock: (process.env.PAYMENT_MOCK || 'true') === 'true',
  // Cloudflare Turnstile (bepul CAPTCHA). Kalit qo'yilmasa tekshiruv
  // o'tkazib yuboriladi — lokal ishlab chiqishda qulay, ishlab chiqarishda
  // kalitni albatta qo'yish kerak (server ogohlantirish beradi).
  // Kalitlarni admin panelidan ham qo'yish mumkin (SiteSetting) — u holda
  // paneldagi qiymatlar ustuvor, .env esa zaxira bo'lib qoladi.
  turnstile: {
    secret: process.env.TURNSTILE_SECRET_KEY || '',
    // Ommaviy kalit — brauzerga beriladi. Frontendda NEXT_PUBLIC_ o'zgaruvchisi
    // bo'lmasa, sayt buni /api/home/security orqali oladi.
    siteKey: process.env.TURNSTILE_SITE_KEY || '',
  },
  // Saytning ommaviy manzili — Telegram webhook shu manzilga qo'yiladi.
  // Railway o'zi RAILWAY_PUBLIC_DOMAIN beradi; lokalda bo'sh bo'ladi va bot
  // webhook o'rniga polling rejimida ishlaydi.
  publicUrl: (process.env.PUBLIC_URL
    || (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : '')
  ).replace(/\/+$/, ''),
  // Telegram bot tokeni — asosiy joyi admin panel, bu zaxira
  telegram: {
    token: process.env.TELEGRAM_BOT_TOKEN || '',
  },
  email: {
    // Mock rejimda haqiqiy email ketmaydi — konsolga log qilinadi
    mock: (process.env.EMAIL_MOCK || 'true') === 'true',
    from: process.env.EMAIL_FROM || 'Ustoz <no-reply@ustoz.uz>',
    smtp: {
      host: process.env.SMTP_HOST || '',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: (process.env.SMTP_SECURE || 'false') === 'true',
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
    },
  },
};

module.exports = env;
