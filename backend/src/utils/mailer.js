// Email yuborish yordamchisi.
// Sozlamalar admin panelidan (SiteSetting → email_config) olinadi, panel bo'sh
// bo'lsa .env qiymatlari ishlatiladi — qarang: utils/settings.js#getEmailConfig
//
// Mock rejimda (standart) haqiqiy email ketmaydi — konsolga log qilinadi.
const { getEmailConfig } = require('./settings');

// Transportni qayta ishlatamiz, ammo sozlama o'zgarsa yangisini quramiz.
// Shuning uchun keshni sozlama "imzosi" bo'yicha saqlaymiz — panelda parol
// almashtirilsa, server qayta ishga tushirilmasdan yangi ulanish yaratiladi.
let cache = null; // { sig, transporter }

const signature = (cfg) => [cfg.host, cfg.port, cfg.secure, cfg.user, cfg.pass].join('|');

function getTransporter(cfg) {
  const sig = signature(cfg);
  if (cache && cache.sig === sig) return cache.transporter;

  // Eski ulanishlar ochiq qolmasin
  if (cache && typeof cache.transporter.close === 'function') {
    try { cache.transporter.close(); } catch { /* e'tiborsiz */ }
  }

  // nodemailer faqat haqiqiy rejimda talab qilinadi
  const nodemailer = require('nodemailer');
  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: cfg.user ? { user: cfg.user, pass: cfg.pass } : undefined,
  });
  cache = { sig, transporter };
  return transporter;
}

// Bitta email yuboradi. Muvaffaqiyatda { sent: true, mocked } qaytaradi.
// Xatolikda ilova to'xtamasligi uchun { sent: false, error } qaytaradi.
async function sendMail({ to, subject, text, html }) {
  const cfg = await getEmailConfig();

  // Mock rejim yoki SMTP sozlanmagan bo'lsa — log qilamiz
  if (cfg.mock || !cfg.host) {
    console.log('📧 [EMAIL MOCK] ->', to, '|', subject);
    if (text) console.log('   ', text.replace(/\n/g, '\n    '));
    return { sent: true, mocked: true };
  }
  try {
    await getTransporter(cfg).sendMail({ from: cfg.from, to, subject, text, html });
    return { sent: true, mocked: false };
  } catch (err) {
    console.error('❌ Email yuborishda xatolik:', err.message);
    return { sent: false, error: err.message };
  }
}

// Sinov xati — mock rejimni chetlab o'tib, haqiqatan SMTP orqali yuboradi.
// Admin "Haqiqiy xat yuborish" ni yoqishdan oldin sozlamani sinab ko'rishi uchun.
async function sendTestMail(to) {
  const cfg = await getEmailConfig();
  if (!cfg.host) return { sent: false, error: 'SMTP server ko\'rsatilmagan' };
  try {
    await getTransporter(cfg).sendMail({
      from: cfg.from,
      to,
      subject: 'Ustoz — SMTP sinovi',
      text: 'Bu Ustoz platformasidan yuborilgan sinov xati.\n\n'
        + 'Agar shu xatni ko\'rayotgan bo\'lsangiz, SMTP sozlamasi to\'g\'ri ishlayapti.',
      html: '<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#1e1b4b">'
        + '<h2>SMTP sozlamasi ishlayapti ✅</h2>'
        + '<p style="color:#475569;line-height:1.6">Bu Ustoz platformasidan yuborilgan sinov xati. '
        + '"Haqiqiy xat yuborish" yoqilgach, ro\'yxatdan o\'tish va parolni tiklash kodlari '
        + 'shu sozlama orqali boradi.</p></div>',
    });
    return { sent: true, from: cfg.from };
  } catch (err) {
    return { sent: false, error: err.message };
  }
}

// SMTP sozlamasi haqiqatan ishlayotganini tekshiradi (ulanish + parol).
// `npm run mail:test` va admin paneldagi "Sinab ko'rish" shuni ishlatadi.
// Mock rejimni chetlab o'tib tekshirish uchun: verifyTransport({ ignoreMock: true })
async function verifyTransport({ ignoreMock = false } = {}) {
  const cfg = await getEmailConfig();
  if (cfg.mock && !ignoreMock) return { ok: false, reason: 'mock' };
  if (!cfg.host) return { ok: false, reason: 'no-host' };
  try {
    await getTransporter(cfg).verify();
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: 'error', error: err.message };
  }
}

// Server ishga tushganda email sozlamasi holatini bir marta chiqaradi.
// Ishlab chiqarishda mock rejim qolib ketsa, hech kim ro'yxatdan o'ta olmaydi —
// shuning uchun bu holat alohida ogohlantiriladi.
async function logMailStatus() {
  const env = require('../config/env');
  let cfg;
  try {
    cfg = await getEmailConfig();
  } catch (err) {
    console.warn('⚠️  Email sozlamasini o\'qib bo\'lmadi:', err.message);
    return;
  }

  const where = cfg.source === 'db' ? 'admin panel' : '.env';
  if (cfg.mock) {
    const msg = '📧 Email: MOCK rejim — xatlar yuborilmaydi, kodlar konsolga chiqadi';
    if (env.nodeEnv === 'production') {
      console.warn(`⚠️  ${msg}. Admin panel → Email bo'limida "Haqiqiy xat yuborish" ni`
        + ' yoqing, aks holda yangi foydalanuvchilar tasdiqlash kodini ololmaydi!');
    } else {
      console.log(msg);
    }
    return;
  }
  if (!cfg.host) {
    console.warn('⚠️  Email: mock o\'chirilgan, ammo SMTP server ko\'rsatilmagan —'
      + ' xatlar baribir yuborilmaydi (mock rejimga tushadi)');
    return;
  }
  console.log(`📧 Email: ${cfg.host}:${cfg.port} orqali yuboriladi`
    + ` (${cfg.user || 'autentifikatsiyasiz'}, manba: ${where})`);
}

module.exports = { sendMail, sendTestMail, verifyTransport, logMailStatus };
