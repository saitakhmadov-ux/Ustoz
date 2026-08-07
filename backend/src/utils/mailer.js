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

module.exports = { sendMail };
