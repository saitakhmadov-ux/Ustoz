// Xabar yuborishning yagona joyi — kanallar bo'ylab (sayt, Telegram, email).
//
// Qoida: bildirishnoma HECH QACHON asosiy amalni buzmaydi. Telegram javob
// bermasa yoki foydalanuvchi botni bloklagan bo'lsa, kursga yozilish yoki
// to'lov baribir muvaffaqiyatli yakunlanadi — shuning uchun barcha xatolar
// shu yerda ushlanadi va faqat logga chiqadi.
//
// Avtomatik hodisalar email yubormaydi: Telegram bepul va tezkor, email esa
// kunlik chegarali (Gmail ~500). Email faqat admin qo'lda tanlaganda ketadi.
const prisma = require('../config/prisma');
const env = require('../config/env');
const { sendMessage } = require('../telegram/bot');

const siteUrl = () => String(env.clientUrl).split(',')[0].trim().replace(/\/+$/, '');

// Telegram HTML rejimi uchun himoya
const esc = (s) => String(s || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

// Telegram xabari ko'rinishi: sarlavha, matn va (bo'lsa) havola
function formatTelegram({ title, body, url }) {
  const parts = [`<b>${esc(title)}</b>`, '', esc(body)];
  if (url) parts.push('', url.startsWith('http') ? url : `${siteUrl()}${url}`);
  return parts.join('\n');
}

// Bitta foydalanuvchiga xabar.
// channels: { app=true, telegram=true, email=false }
// Qaytaradi: { app, telegram, email } — qaysi kanal haqiqatan ishlaganini bildiradi.
async function notifyUser(userId, {
  title, body, url = null, senderId = null,
  app = true, telegram = true, email = false,
} = {}) {
  const result = { app: false, telegram: false, email: false };

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, telegramChatId: true },
    });
    if (!user) return result;

    if (telegram && user.telegramChatId) {
      const sent = await sendMessage(user.telegramChatId, formatTelegram({ title, body, url }));
      result.telegram = sent.sent;
      // Bot bloklangan bo'lsa bog'lanishni tozalaymiz — keyingi safar urinmaymiz
      if (!sent.sent && /blocked|chat not found|deactivated/i.test(sent.error || '')) {
        await prisma.user.update({
          where: { id: user.id },
          data: { telegramChatId: null, telegramUsername: null, telegramLinkedAt: null },
        });
      }
    }

    if (email && user.email) {
      // Talab bo'lgandagina yuklaymiz — mailer sozlamani bazadan o'qiydi
      const { sendMail } = require('./mailer');
      const sent = await sendMail({ to: user.email, subject: title, text: body });
      result.email = sent.sent;
    }

    if (app) {
      await prisma.notification.create({
        data: {
          userId,
          senderId,
          title,
          body,
          emailSent: result.email,
          telegramSent: result.telegram,
        },
      });
      result.app = true;
    }
  } catch (err) {
    console.error('Bildirishnoma yuborishda xatolik:', err.message);
  }

  return result;
}

/* ---------------- Avtomatik hodisalar ---------------- */
// Har biri "otib yubor va unut" uslubida — chaqiruvchi natijani kutmasligi ham
// mumkin, ammo kutsa xato tashlanmaydi.

// O'quvchi kursga yozildi
function notifyEnrolled(userId, course) {
  return notifyUser(userId, {
    title: 'Kursga yozildingiz',
    body: `"${course.title}" kursiga yozildingiz. Darslarni boshlashingiz mumkin!`,
    url: `/learn/${course.slug}`,
  });
}

// To'lov muvaffaqiyatli o'tdi
function notifyPaid(userId, course, payment) {
  const summa = new Intl.NumberFormat('uz-UZ').format(payment.amount);
  return notifyUser(userId, {
    title: "To'lov qabul qilindi",
    body: `"${course.title}" kursi uchun ${summa} so'm to'lov qabul qilindi. Kurs ochildi!`,
    url: `/receipt/${payment.id}`,
  });
}

// Kurs tugatildi va sertifikat berildi
function notifyCertificate(userId, course, certificate) {
  return notifyUser(userId, {
    title: 'Tabriklaymiz! Sertifikat tayyor 🎓',
    body: `"${course.title}" kursini to'liq tugatdingiz. Sertifikat raqami: ${certificate.serial}`,
    url: `/certificates/${certificate.id}`,
  });
}

// Kirish muddati tugayapti
function notifyAccessExpiring(userId, course, daysLeft) {
  const kun = daysLeft === 1 ? '1 kun' : `${daysLeft} kun`;
  return notifyUser(userId, {
    title: 'Kurs muddati tugayapti',
    body: `"${course.title}" kursidan foydalanish muddati ${kun}dan keyin tugaydi. `
      + 'Davom etish uchun muddatni yangilang.',
    url: `/courses/${course.slug}`,
  });
}

// Ustozga: kursiga yangi o'quvchi yozildi
function notifyInstructorNewStudent(instructorId, studentName, course) {
  if (!instructorId) return Promise.resolve(null);
  return notifyUser(instructorId, {
    title: "Yangi o'quvchi",
    body: `${studentName} — "${course.title}" kursingizga yozildi.`,
    url: '/admin/students',
  });
}

// Ustozga: kursiga yangi sharh qoldirildi
function notifyInstructorReview(instructorId, studentName, course, rating) {
  if (!instructorId) return Promise.resolve(null);
  return notifyUser(instructorId, {
    title: 'Yangi sharh',
    body: `${studentName} "${course.title}" kursiga ${rating} yulduz baho qoldirdi.`,
    url: '/admin/courses',
  });
}

module.exports = {
  notifyUser,
  formatTelegram,
  notifyEnrolled,
  notifyPaid,
  notifyCertificate,
  notifyAccessExpiring,
  notifyInstructorNewStudent,
  notifyInstructorReview,
};
