// Autentifikatsiya bilan bog'liq email matnlari — bir joyda turgani uchun
// uslub va imzo hamma xatda bir xil bo'ladi.
const { sendMail } = require('./mailer');
const { CODE_TTL_MIN } = require('./verification');

const BRAND = 'Ustoz';

function codeHtml({ title, intro, code, note }) {
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#1e1b4b">
    <h2 style="margin:0 0 12px">${title}</h2>
    <p style="margin:0 0 18px;color:#475569;line-height:1.6">${intro}</p>
    <div style="font-size:32px;font-weight:bold;letter-spacing:8px;text-align:center;
                background:#eef2ff;border-radius:12px;padding:18px 0;margin:0 0 18px">${code}</div>
    <p style="margin:0 0 8px;color:#475569">Kod <b>${CODE_TTL_MIN} daqiqa</b> amal qiladi.</p>
    <p style="margin:0;color:#94a3b8;font-size:13px">${note}</p>
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:22px 0">
    <p style="margin:0;color:#94a3b8;font-size:12px">${BRAND} — onlayn IT ta'lim platformasi</p>
  </div>`;
}

// Ro'yxatdan o'tishda emailni tasdiqlash kodi
function sendVerifyEmail(to, fullName, code) {
  const title = 'Emailingizni tasdiqlang';
  const intro = `Assalomu alaykum, ${fullName}! ${BRAND} platformasida ro'yxatdan o'tishni yakunlash uchun quyidagi kodni kiriting.`;
  const note = "Agar siz ro'yxatdan o'tmagan bo'lsangiz, bu xatga e'tibor bermang.";
  return sendMail({
    to,
    subject: `${BRAND} — tasdiqlash kodi: ${code}`,
    text: `${intro}\n\nKod: ${code}\nKod ${CODE_TTL_MIN} daqiqa amal qiladi.\n\n${note}`,
    html: codeHtml({ title, intro, code, note }),
  });
}

// Parolni tiklash kodi
function sendPasswordResetEmail(to, fullName, code) {
  const title = 'Parolni tiklash';
  const intro = `Assalomu alaykum, ${fullName}! Parolni tiklash so'rovi qabul qilindi. Yangi parol o'rnatish uchun quyidagi kodni kiriting.`;
  const note = "Agar bu so'rovni siz yubormagan bo'lsangiz, parolingiz o'zgarmaydi — bu xatni e'tiborsiz qoldiring.";
  return sendMail({
    to,
    subject: `${BRAND} — parolni tiklash kodi: ${code}`,
    text: `${intro}\n\nKod: ${code}\nKod ${CODE_TTL_MIN} daqiqa amal qiladi.\n\n${note}`,
    html: codeHtml({ title, intro, code, note }),
  });
}

// Parol o'zgargani haqida xabar — egasi bilmasdan o'zgartirilsa darrov bilsin
function sendPasswordChangedEmail(to, fullName) {
  const text = `Assalomu alaykum, ${fullName}! ${BRAND} hisobingiz paroli hozirgina o'zgartirildi.\n\n`
    + 'Agar bu siz bo\'lmasangiz, zudlik bilan parolni tiklang va biz bilan bog\'laning.';
  return sendMail({
    to,
    subject: `${BRAND} — parolingiz o'zgartirildi`,
    text,
    html: `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#1e1b4b">
      <h2 style="margin:0 0 12px">Parolingiz o'zgartirildi</h2>
      <p style="color:#475569;line-height:1.6">${text.replace(/\n/g, '<br>')}</p>
    </div>`,
  });
}

module.exports = { sendVerifyEmail, sendPasswordResetEmail, sendPasswordChangedEmail };
