// Auth yo'nalishlari
const express = require('express');
const {
  register, verifyEmail, resendCode, login, forgotPassword, resetPassword, me,
  telegramVerifyStart, telegramVerifyStatus,
} = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth');
const { registerLimiter, loginLimiter, codeLimiter } = require('../middleware/rateLimit');

const router = express.Router();

router.post('/register', registerLimiter, register);
router.post('/login', loginLimiter, login);

// Email tasdiqlash. Kod yuborish qat'iy cheklangan (soatiga 5 ta),
// kodni tekshirish esa login bilan bir xil chegarada — brute-force uchun.
router.post('/verify-email', loginLimiter, verifyEmail);
router.post('/resend-code', codeLimiter, resendCode);

// Telegram orqali tasdiqlash. Havola olish cheklangan (soatiga 5 ta), holat
// so'rovi esa cheklanmaydi — brauzer uni bir necha soniyada bir marta so'raydi
// va bu yerda hech qanday sir topishga urinish yo'q (kalitni bilish shart).
router.post('/telegram-verify/start', codeLimiter, telegramVerifyStart);
router.post('/telegram-verify/status', telegramVerifyStatus);

// Parolni tiklash
router.post('/forgot-password', codeLimiter, forgotPassword);
router.post('/reset-password', loginLimiter, resetPassword);

router.get('/me', protect, me);

module.exports = router;
