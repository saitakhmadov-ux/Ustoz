// Foydalanuvchining bildirishnoma sozlamalari.
//
// Har bir avtomatik hodisaning kaliti bor. Foydalanuvchi kerakmasini
// o'chirib qo'yadi — kalit `User.notifyOff` ro'yxatiga tushadi va o'sha
// hodisa bo'yicha Telegram xabari yuborilmaydi.
//
// MUHIM: sozlama faqat TELEGRAM kanaliga ta'sir qiladi. Sayt ichidagi
// bildirishnomalar (qo'ng'iroqcha ro'yxati) baribir yoziladi — aks holda
// odam to'lov yoki sertifikat haqidagi yozuvni butunlay yo'qotib qo'yardi.
// Admin qo'lda yuborgan xabarlar ham har doim yetkaziladi (ular hodisa emas).
//
// Kunlik eslatma alohida ustunda (`progressPingOff`, botdagi /kunlik) saqlanadi,
// ammo ro'yxatda shu yerda ko'rinadi — foydalanuvchi uchun bularning hammasi
// bitta joyda bo'lgani qulay.
const prisma = require('../config/prisma');

const DAILY_KEY = 'daily';

const NOTIFY_EVENTS = [
  { key: 'enrolled', label: 'Kursga yozilganda', description: 'Yangi kursga kirish ochilganda' },
  { key: 'paid', label: "To'lov qabul qilinganda", description: "To'lov o'tgani va chek haqida" },
  { key: 'certificate', label: 'Sertifikat berilganda', description: 'Kurs tugatilib sertifikat tayyor bo\'lganda' },
  { key: 'lesson', label: "Yangi dars qo'shilganda", description: 'Yozilgan kursingizga yangi dars chiqqanda' },
  { key: 'expiry', label: 'Kurs muddati tugayotganda', description: 'Kirish muddati tugashidan 3 kun oldin' },
  { key: DAILY_KEY, label: 'Kunlik progress eslatmasi', description: "Tugatilmagan kurslar bo'yicha kuniga bir marta" },
  {
    key: 'student', label: "Kursimga yangi o'quvchi", description: 'Ustozlar uchun', teacher: true,
  },
  {
    key: 'review', label: 'Kursimga yangi sharh', description: 'Ustozlar uchun', teacher: true,
  },
];

const isTeacherRole = (role) => role === 'INSTRUCTOR' || role === 'ADMIN';

// Rolga mos hodisalar ro'yxati (o'quvchiga ustoz sozlamalari ko'rsatilmaydi)
const eventsFor = (role) => NOTIFY_EVENTS.filter((e) => !e.teacher || isTeacherRole(role));

const VALID_KEYS = new Set(NOTIFY_EVENTS.map((e) => e.key));

// Foydalanuvchining o'chirilgan kalitlari (kunlik eslatma bilan birga)
function offKeys(user) {
  const off = Array.isArray(user?.notifyOff) ? [...user.notifyOff] : [];
  if (user?.progressPingOff) off.push(DAILY_KEY);
  return off;
}

// Shu hodisa bo'yicha Telegram xabari yuborilsinmi?
function isEventOn(user, key) {
  if (!key) return true; // hodisa ko'rsatilmagan (admin xabari) — har doim
  if (key === DAILY_KEY) return !user?.progressPingOff;
  return !(Array.isArray(user?.notifyOff) && user.notifyOff.includes(key));
}

// O'chirilganlar ro'yxatini to'liq almashtiradi (saytdagi forma uchun).
// Noma'lum kalitlar e'tiborga olinmaydi.
async function setOffKeys(userId, keys) {
  const wanted = (Array.isArray(keys) ? keys : []).filter((k) => VALID_KEYS.has(k));
  await prisma.user.update({
    where: { id: userId },
    data: {
      notifyOff: wanted.filter((k) => k !== DAILY_KEY),
      progressPingOff: wanted.includes(DAILY_KEY),
    },
  });
  return wanted;
}

// Bitta kalitni teskarisiga o'giradi (botdagi tugmalar uchun).
// Qaytaradi: yangi holat — true = yoqilgan.
async function toggleKey(user, key) {
  if (!VALID_KEYS.has(key)) return null;
  const on = isEventOn(user, key);
  const off = offKeys(user).filter((k) => k !== key);
  if (on) off.push(key); // yoqilgan edi -> o'chiramiz
  await setOffKeys(user.id, off);
  return !on;
}

module.exports = {
  NOTIFY_EVENTS, DAILY_KEY, eventsFor, offKeys, isEventOn, setOffKeys, toggleKey,
};
