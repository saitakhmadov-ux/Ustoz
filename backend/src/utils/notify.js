// Xabar yuborishning yagona joyi — kanallar bo'ylab (sayt, Telegram, email).
//
// Qoida: bildirishnoma HECH QACHON asosiy amalni buzmaydi. Telegram javob
// bermasa yoki foydalanuvchi botni bloklagan bo'lsa, kursga yozilish yoki
// to'lov baribir muvaffaqiyatli yakunlanadi — shuning uchun barcha xatolar
// shu yerda ushlanadi va faqat logga chiqadi.
//
// Avtomatik hodisalar email yubormaydi: Telegram bepul va tezkor, email esa
// kunlik chegarali (Gmail ~500). Email faqat admin qo'lda tanlaganda ketadi.
//
// Har bir avtomatik hodisaning kaliti bor (`event`) — foydalanuvchi kerakmasini
// profilda yoki botda o'chirib qo'yishi mumkin (utils/notifyPrefs.js).
const prisma = require('../config/prisma');
const env = require('../config/env');
const { sendMessage } = require('../telegram/bot');
const { enqueue, enqueueMany } = require('../jobs/telegramQueue');
const { isEventOn } = require('./notifyPrefs');

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
// Qaytaradi: { app, telegram, email, queued } — qaysi kanal ishlagani.
// `queued` — Telegram darhol yubora olmadi, xabar navbatga qo'yildi.
async function notifyUser(userId, {
  title, body, url = null, senderId = null, event = null,
  app = true, telegram = true, email = false,
} = {}) {
  const result = {
    app: false, telegram: false, email: false, queued: false,
  };

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        telegramChatId: true,
        notifyOff: true,
        progressPingOff: true,
      },
    });
    if (!user) return result;

    // Foydalanuvchi shu turdagi xabarni o'chirib qo'ygan bo'lsa Telegram'ga
    // yubormaymiz — sayt ichidagi yozuv baribir saqlanadi
    if (telegram && !isEventOn(user, event)) {
      result.mutedTelegram = true;
    } else if (telegram && user.telegramChatId) {
      const text = formatTelegram({ title, body, url });
      const sent = await sendMessage(user.telegramChatId, text);
      result.telegram = sent.sent;

      if (!sent.sent) {
        // Bot bloklangan bo'lsa bog'lanishni tozalaymiz — keyingi safar urinmaymiz
        if (sent.code === 403 || /blocked|chat not found|deactivated/i.test(sent.error || '')) {
          await prisma.user.update({
            where: { id: user.id },
            data: { telegramChatId: null, telegramUsername: null, telegramLinkedAt: null },
          });
        } else {
          // Vaqtinchalik xatolik (429, tarmoq, bot o'chirilgan) — xabar
          // yo'qolmasin: navbatga qo'yamiz, u qayta urinib ko'radi
          await enqueue(user.telegramChatId, text);
          result.queued = true;
        }
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
          // Navbatga qo'yilgani ham "Telegram orqali ketdi" hisoblanadi —
          // vazifa uni baribir yetkazadi (yoki 5 urinishdan keyin log qoladi)
          telegramSent: result.telegram || result.queued,
        },
      });
      result.app = true;
    }
  } catch (err) {
    console.error('Bildirishnoma yuborishda xatolik:', err.message);
  }

  return result;
}

// Ko'p foydalanuvchiga bir xil xabar (kurs o'quvchilari kabi).
//
// Telegram darhol emas, navbat orqali ketadi — so'rov/vazifa kutib turmaydi va
// tezlik chegarasi buzilmaydi. Xabarni o'chirib qo'yganlar chetlab o'tiladi,
// ammo sayt ichidagi yozuv hammaga yoziladi.
// Qaytaradi: { app, queued } — nechta yozuv va nechta Telegram xabari.
async function notifyMany(userIds, {
  title, body, url = null, senderId = null, event = null, app = true, telegram = true,
} = {}) {
  const ids = [...new Set(userIds)].filter(Boolean);
  const result = { app: 0, queued: 0 };
  if (!ids.length) return result;

  try {
    const users = await prisma.user.findMany({
      where: { id: { in: ids } },
      select: {
        id: true, telegramChatId: true, notifyOff: true, progressPingOff: true,
      },
    });

    if (telegram) {
      const text = formatTelegram({ title, body, url });
      const targets = users.filter((u) => u.telegramChatId && isEventOn(u, event));
      result.queued = await enqueueMany(
        targets.map((u) => ({ chatId: u.telegramChatId, text })),
      );
    }

    if (app) {
      const created = await prisma.notification.createMany({
        data: users.map((u) => ({
          userId: u.id,
          senderId,
          title,
          body,
          telegramSent: telegram && Boolean(u.telegramChatId) && isEventOn(u, event),
        })),
      });
      result.app = created.count;
    }
  } catch (err) {
    console.error('Ommaviy bildirishnomada xatolik:', err.message);
  }

  return result;
}

/* ---------------- Avtomatik hodisalar ---------------- */
// Har biri "otib yubor va unut" uslubida — chaqiruvchi natijani kutmasligi ham
// mumkin, ammo kutsa xato tashlanmaydi.

// O'quvchi kursga yozildi
function notifyEnrolled(userId, course) {
  return notifyUser(userId, {
    event: 'enrolled',
    title: 'Kursga yozildingiz',
    body: `"${course.title}" kursiga yozildingiz. Darslarni boshlashingiz mumkin!`,
    url: `/learn/${course.slug}`,
  });
}

// To'lov muvaffaqiyatli o'tdi
function notifyPaid(userId, course, payment) {
  const summa = new Intl.NumberFormat('uz-UZ').format(payment.amount);
  return notifyUser(userId, {
    event: 'paid',
    title: "To'lov qabul qilindi",
    body: `"${course.title}" kursi uchun ${summa} so'm to'lov qabul qilindi. Kurs ochildi!`,
    url: `/receipt/${payment.id}`,
  });
}

// Kurs tugatildi va sertifikat berildi
function notifyCertificate(userId, course, certificate) {
  return notifyUser(userId, {
    event: 'certificate',
    title: 'Tabriklaymiz! Sertifikat tayyor 🎓',
    body: `"${course.title}" kursini to'liq tugatdingiz. Sertifikat raqami: ${certificate.serial}`,
    url: `/certificates/${certificate.id}`,
  });
}

// Kirish muddati tugayapti
function notifyAccessExpiring(userId, course, daysLeft) {
  const kun = daysLeft === 1 ? '1 kun' : `${daysLeft} kun`;
  return notifyUser(userId, {
    event: 'expiry',
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
    event: 'student',
    title: "Yangi o'quvchi",
    body: `${studentName} — "${course.title}" kursingizga yozildi.`,
    url: '/admin/students',
  });
}

// Ustozga: kursiga yangi sharh qoldirildi
function notifyInstructorReview(instructorId, studentName, course, rating) {
  if (!instructorId) return Promise.resolve(null);
  return notifyUser(instructorId, {
    event: 'review',
    title: 'Yangi sharh',
    body: `${studentName} "${course.title}" kursiga ${rating} yulduz baho qoldirdi.`,
    url: '/admin/courses',
  });
}

module.exports = {
  notifyUser,
  notifyMany,
  formatTelegram,
  notifyEnrolled,
  notifyPaid,
  notifyCertificate,
  notifyAccessExpiring,
  notifyInstructorNewStudent,
  notifyInstructorReview,
};
