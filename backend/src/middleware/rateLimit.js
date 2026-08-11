// So'rovlar chastotasini cheklash — bot yordamida ommaviy akkaunt ochish,
// parolni brute-force qilish va kod yuborishni suiiste'mol qilishga qarshi.
//
// Cheklov IP bo'yicha ishlaydi. Railway/Vercel proxy ortida turgani uchun
// app.js da `trust proxy` yoqilgan — aks holda hamma so'rov bitta IP ko'rinadi.
const rateLimit = require('express-rate-limit');

// Cheklov ishga tushganda loyihaning odatiy xato formatida javob qaytaramiz
function limitHandler(message) {
  return (req, res) => {
    res.status(429).json({ success: false, message });
  };
}

const common = {
  standardHeaders: true, // RateLimit-* sarlavhalari
  legacyHeaders: false,
  // Sinov muhitida cheklovni o'chirib qo'yish mumkin (E2E testlar uchun)
  skip: () => process.env.RATE_LIMIT_DISABLED === 'true',
};

// Ro'yxatdan o'tish — bir IP dan soatiga 5 ta
const registerLimiter = rateLimit({
  ...common,
  windowMs: 60 * 60 * 1000,
  limit: 5,
  handler: limitHandler(
    "Ro'yxatdan o'tish urinishlari juda ko'p. Bir soatdan so'ng qayta urinib ko'ring."
  ),
});

// Kirish — 15 daqiqada 10 ta. Muvaffaqiyatli kirish hisobga olinmaydi,
// shuning uchun to'g'ri parol bilan ishlayotgan foydalanuvchi bloklanmaydi.
const loginLimiter = rateLimit({
  ...common,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  handler: limitHandler(
    "Juda ko'p noto'g'ri urinish. 15 daqiqadan so'ng qayta urinib ko'ring."
  ),
});

// Kod yuborish (tasdiqlash va parolni tiklash) — soatiga 5 ta.
// Bu email jo'natishni ham, kodni topishga urinishni ham cheklaydi.
const codeLimiter = rateLimit({
  ...common,
  windowMs: 60 * 60 * 1000,
  limit: 5,
  handler: limitHandler(
    "Kod so'rash urinishlari juda ko'p. Bir soatdan so'ng qayta urinib ko'ring."
  ),
});

// Butun API uchun umumiy chegara — bitta IP dan 15 daqiqada 600 ta.
// Oddiy foydalanuvchi bunga yaqinlashmaydi; maqsad — skanerlash va
// avtomatlashtirilgan yuklamani cheklash.
const apiLimiter = rateLimit({
  ...common,
  windowMs: 15 * 60 * 1000,
  limit: 600,
  handler: limitHandler("So'rovlar juda ko'p. Birozdan so'ng qayta urinib ko'ring."),
});

module.exports = { registerLimiter, loginLimiter, codeLimiter, apiLimiter };
