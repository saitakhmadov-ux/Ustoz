// SMTP sozlamasini tekshirish skripti.
//
//   npm run mail:test                  -> ADMIN_EMAIL manziliga yuboradi
//   npm run mail:test siz@gmail.com    -> ko'rsatilgan manzilga yuboradi
//
// Skript avval ulanish va parolni tekshiradi (verify), keyin sinov xati yuboradi.
// Parol hech qaerga chiqarilmaydi — faqat oxirgi 2 belgisi ko'rsatiladi.
const env = require('../src/config/env');
const { sendMail, verifyTransport } = require('../src/utils/mailer');

function mask(value) {
  if (!value) return '(bo\'sh)';
  if (value.length <= 4) return '****';
  return `${'*'.repeat(value.length - 2)}${value.slice(-2)}`;
}

// Eng ko'p uchraydigan xatolarni tushunarli tilga o'giradi
function explain(message) {
  const m = String(message || '');
  if (/Invalid login|535|BadCredentials/i.test(m)) {
    return 'Login yoki parol qabul qilinmadi. Gmail uchun oddiy parol EMAS,\n'
      + '   16 belgili "App password" kerak va akkauntda 2 bosqichli tasdiqlash yoqilgan bo\'lishi shart.';
  }
  if (/ETIMEDOUT|ECONNREFUSED|ENOTFOUND/i.test(m)) {
    return 'Serverga ulanib bo\'lmadi. SMTP_HOST va SMTP_PORT ni tekshiring\n'
      + '   (Gmail: smtp.gmail.com, 587 + SMTP_SECURE=false yoki 465 + SMTP_SECURE=true).';
  }
  if (/self signed|certificate/i.test(m)) {
    return 'Sertifikat muammosi — SMTP_SECURE qiymati portga mos emasga o\'xshaydi.';
  }
  return null;
}

async function main() {
  // Standart qabul qiluvchi — o'z Gmail manzilingiz (o'zingizga yuborib tekshirish).
  // SMTP_USER bo'sh bo'lsa ADMIN_EMAIL ga tushamiz.
  const to = process.argv[2] || env.email.smtp.user || env.admin.email;

  console.log('--- Email sozlamalari ---');
  console.log('  EMAIL_MOCK :', env.email.mock);
  console.log('  EMAIL_FROM :', env.email.from);
  console.log('  SMTP_HOST  :', env.email.smtp.host || '(bo\'sh)');
  console.log('  SMTP_PORT  :', env.email.smtp.port);
  console.log('  SMTP_SECURE:', env.email.smtp.secure);
  console.log('  SMTP_USER  :', env.email.smtp.user || '(bo\'sh)');
  console.log('  SMTP_PASS  :', mask(env.email.smtp.pass));
  console.log('  Qabul qiluvchi:', to);
  console.log();

  if (env.email.mock) {
    console.log('⚠️  EMAIL_MOCK=true — haqiqiy xat yuborilmaydi.');
    console.log('   .env da EMAIL_MOCK=false qiling va qaytadan urinib ko\'ring.');
    process.exit(1);
  }

  process.stdout.write('1) Ulanish va parol tekshirilmoqda... ');
  const check = await verifyTransport();
  if (!check.ok) {
    console.log('XATO');
    console.error('  Sabab:', check.error || check.reason);
    const hint = explain(check.error);
    if (hint) console.error('  ->', hint);
    process.exit(1);
  }
  console.log('OK');

  process.stdout.write('2) Sinov xati yuborilmoqda... ');
  const res = await sendMail({
    to,
    subject: 'Ustoz — SMTP sinovi',
    text: 'Bu Ustoz platformasidan yuborilgan sinov xati.\n\n'
      + 'Agar shu xatni ko\'rayotgan bo\'lsangiz, SMTP sozlamasi to\'g\'ri ishlayapti.\n'
      + 'Endi ro\'yxatdan o\'tish va parolni tiklash kodlari haqiqiy pochtaga boradi.',
    html: '<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#1e1b4b">'
      + '<h2>SMTP sozlamasi ishlayapti ✅</h2>'
      + '<p style="color:#475569;line-height:1.6">Bu Ustoz platformasidan yuborilgan sinov xati. '
      + 'Endi ro\'yxatdan o\'tish va parolni tiklash kodlari haqiqiy pochtaga boradi.</p></div>',
  });

  if (!res.sent) {
    console.log('XATO');
    console.error('  Sabab:', res.error);
    const hint = explain(res.error);
    if (hint) console.error('  ->', hint);
    process.exit(1);
  }
  console.log('OK');
  console.log(`\n✅ Tayyor. ${to} pochtasini tekshiring (Spam papkasini ham).`);
}

main().catch((err) => {
  console.error('Kutilmagan xatolik:', err.message);
  process.exit(1);
});
