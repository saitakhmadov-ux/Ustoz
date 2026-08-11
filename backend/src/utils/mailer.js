// Email yuborish yordamchisi.
// EMAIL_MOCK=true (standart) bo'lsa haqiqiy email ketmaydi — konsolga log qilinadi.
// Haqiqiy yuborish uchun .env da EMAIL_MOCK=false va SMTP_* to'ldiriladi.
const env = require('../config/env');

let transporter = null;

// SMTP transportini bir marta yaratamiz (kerak bo'lsa)
function getTransporter() {
  if (transporter) return transporter;
  // nodemailer faqat haqiqiy rejimda talab qilinadi
  const nodemailer = require('nodemailer');
  transporter = nodemailer.createTransport({
    host: env.email.smtp.host,
    port: env.email.smtp.port,
    secure: env.email.smtp.secure,
    auth: env.email.smtp.user
      ? { user: env.email.smtp.user, pass: env.email.smtp.pass }
      : undefined,
  });
  return transporter;
}

// Bitta email yuboradi. Muvaffaqiyatda { sent: true, mocked } qaytaradi.
// Xatolikda ilova to'xtamasligi uchun { sent: false, error } qaytaradi.
async function sendMail({ to, subject, text, html }) {
  // Mock rejim yoki SMTP sozlanmagan bo'lsa — log qilamiz
  if (env.email.mock || !env.email.smtp.host) {
    console.log('📧 [EMAIL MOCK] ->', to, '|', subject);
    if (text) console.log('   ', text.replace(/\n/g, '\n    '));
    return { sent: true, mocked: true };
  }
  try {
    await getTransporter().sendMail({ from: env.email.from, to, subject, text, html });
    return { sent: true, mocked: false };
  } catch (err) {
    console.error('❌ Email yuborishda xatolik:', err.message);
    return { sent: false, error: err.message };
  }
}

// SMTP sozlamasi haqiqatan ishlayotganini tekshiradi (ulanish + parol).
// `npm run mail:test` shu funksiyani ishlatadi — xatoni yuborishdan oldin ko'rsatadi.
async function verifyTransport() {
  if (env.email.mock) return { ok: false, reason: 'mock' };
  if (!env.email.smtp.host) return { ok: false, reason: 'no-host' };
  try {
    await getTransporter().verify();
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: 'error', error: err.message };
  }
}

// Server ishga tushganda email sozlamasi holatini bir marta chiqaradi.
// Ishlab chiqarishda mock rejim qolib ketsa, hech kim ro'yxatdan o'ta olmaydi —
// shuning uchun bu holat alohida ogohlantiriladi.
function logMailStatus() {
  const { mock, smtp } = env.email;
  if (mock) {
    const msg = '📧 Email: MOCK rejim — xatlar yuborilmaydi, kodlar konsolga chiqadi';
    if (env.nodeEnv === 'production') {
      console.warn(`⚠️  ${msg}. Ishlab chiqarishda EMAIL_MOCK=false qiling, aks holda`
        + ' yangi foydalanuvchilar tasdiqlash kodini ololmaydi!');
    } else {
      console.log(msg);
    }
    return;
  }
  if (!smtp.host) {
    console.warn('⚠️  Email: EMAIL_MOCK=false, ammo SMTP_HOST bo\'sh —'
      + ' xatlar baribir yuborilmaydi (mock rejimga tushadi)');
    return;
  }
  console.log(`📧 Email: ${smtp.host}:${smtp.port} orqali yuboriladi (${smtp.user || 'autentifikatsiyasiz'})`);
}

module.exports = { sendMail, verifyTransport, logMailStatus };
