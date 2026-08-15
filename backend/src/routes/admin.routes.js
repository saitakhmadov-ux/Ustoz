// Admin yo'nalishlari
const express = require('express');
const admin = require('../controllers/admin.controller');
const cur = require('../controllers/curriculum.controller');
const notif = require('../controllers/notification.controller');
const aiAdmin = require('../controllers/ai.admin.controller');
const teaching = require('../controllers/teaching.controller');
const earnings = require('../controllers/earnings.controller');
const promo = require('../controllers/promo.controller');
const { uploadFile, uploadImageFile } = require('../controllers/upload.controller');
const settings = require('../controllers/settings.controller');
const system = require('../controllers/system.controller');
const { upload, uploadImage } = require('../middleware/upload');
const { protect, adminOnly, adminOrInstructor } = require('../middleware/auth');

const router = express.Router();

// Barcha admin yo'nalishlari kirishni talab qiladi
router.use(protect);

// ---- Faqat bosh admin ----
// Statistika va foydalanuvchilar
router.get('/stats', adminOnly, admin.stats);
router.get('/attention', adminOnly, admin.attention);
router.get('/search', adminOnly, admin.search);
router.get('/users', adminOnly, admin.users);
router.post('/users', adminOnly, admin.createUser);
router.get('/users/:id', adminOnly, admin.getUserDetail);
router.patch('/users/:id/role', adminOnly, admin.updateUserRole);
router.post('/users/:id/enrollments', adminOnly, admin.enrollUserToCourse);
router.delete('/users/:id', adminOnly, admin.deleteUser);

// Yozilishlarni qo'lda boshqarish (muddat uzaytirish / chiqarish)
router.patch('/enrollments/:id', adminOnly, admin.extendEnrollment);
router.delete('/enrollments/:id', adminOnly, admin.removeEnrollment);

// Sertifikatlar (ro'yxat + bekor qilish)
router.get('/certificates', adminOnly, admin.listCertificates);
router.delete('/certificates/:id', adminOnly, admin.revokeCertificate);

// Bosh sahifa hero rasmlari (sayt bo'ylab umumiy — faqat bosh admin)
router.get('/hero', adminOnly, settings.getHero);
router.put('/hero', adminOnly, settings.updateHero);
router.post('/hero/upload', adminOnly, uploadImage.single('file'), settings.uploadHeroImage);

// Bosh sahifa tahrirlanadigan matnlari (faqat bosh admin)
router.get('/content', adminOnly, settings.getContent);
router.put('/content', adminOnly, settings.updateContent);

// "Biz haqimizda" sahifasi mazmuni
router.get('/about', adminOnly, settings.getAbout);
router.put('/about', adminOnly, settings.updateAbout);

// "Kontaktlar" sahifasi mazmuni
router.get('/contact', adminOnly, settings.getContact);
router.put('/contact', adminOnly, settings.updateContact);

// Ustoz AI boshqaruvi + analitika (faqat bosh admin)
router.get('/ai/config', adminOnly, aiAdmin.getConfig);
router.put('/ai/config', adminOnly, aiAdmin.updateConfig);
router.get('/ai/models', adminOnly, aiAdmin.listModels);
router.post('/ai/test', adminOnly, aiAdmin.testConfig);
router.get('/ai/analytics', adminOnly, aiAdmin.analytics);

// Email (SMTP) sozlamalari — deploy'siz almashtirish uchun (faqat bosh admin)
router.get('/email', adminOnly, system.getEmail);
router.put('/email', adminOnly, system.updateEmail);
router.post('/email/test', adminOnly, system.testEmail);

// Telegram bot — token, yoqish/o'chirish va sinov xabari (faqat bosh admin)
router.get('/telegram', adminOnly, system.getTelegram);
router.put('/telegram', adminOnly, system.updateTelegram);
router.post('/telegram/test', adminOnly, system.testTelegram);

// Bot himoyasi (Cloudflare Turnstile) kalitlari (faqat bosh admin)
router.get('/security', adminOnly, system.getSecurity);
router.put('/security', adminOnly, system.updateSecurity);

// Sharhlar moderatsiyasi (faqat bosh admin)
router.get('/reviews', adminOnly, admin.listReviews);
router.delete('/reviews/:id', adminOnly, admin.deleteReview);

// To'lovlar ro'yxati (faqat bosh admin)
router.get('/payments', adminOnly, admin.listPayments);

// Maosh hisoboti — umumiy manzara va ustozlar kesimi (faqat bosh admin)
router.get('/earnings', adminOnly, earnings.adminOverview);
router.get('/earnings/export', adminOnly, earnings.adminTransactionsCsv);
router.get('/earnings/instructors/:id', adminOnly, earnings.adminInstructorDetail);

// Ustozlarga o'tkazmalar (payout)
router.get('/payouts', adminOnly, earnings.listPayouts);
router.post('/payouts', adminOnly, earnings.createPayout);
router.patch('/payouts/:id', adminOnly, earnings.updatePayout);
router.delete('/payouts/:id', adminOnly, earnings.deletePayout);

// Soliq va ulush foizlari
router.get('/payout-config', adminOnly, earnings.getConfig);
router.put('/payout-config', adminOnly, earnings.updateConfig);

// Ustoz adminlar boshqaruvi
router.get('/instructors', adminOnly, admin.listInstructors);
router.post('/instructors', adminOnly, admin.createInstructor);
router.delete('/instructors/:id', adminOnly, admin.deleteInstructor);

// ---- Bosh admin yoki biriktirilgan ustoz (egalik controllerda tekshiriladi) ----

// O'qitish statistikasi (ustozning o'z kurslari bo'yicha)
router.get('/teaching/stats', adminOrInstructor, admin.teachingStats);

// O'quvchilar (ustozning kurslariga yozilganlar; egalik controllerda tekshiriladi)
router.get('/teaching/students', adminOrInstructor, teaching.listStudents);
router.get('/teaching/students/:id', adminOrInstructor, teaching.getStudentDetail);

// Maosh (daromad) — ustoz o'z ko'rsatkichlarini ko'radi
router.get('/teaching/earnings', adminOrInstructor, earnings.myEarnings);
router.get('/teaching/earnings/transactions', adminOrInstructor, earnings.myTransactions);
router.get('/teaching/earnings/export', adminOrInstructor, earnings.myTransactionsCsv);
router.get('/teaching/payouts', adminOrInstructor, earnings.myPayouts);

// Promo kodlar (ustoz o'zi boshqaradi; egalik controllerda tekshiriladi)
router.get('/teaching/promo-codes', adminOrInstructor, promo.listPromoCodes);
router.get('/teaching/promo-codes/suggest', adminOrInstructor, promo.suggestPromoCode);
router.post('/teaching/promo-codes', adminOrInstructor, promo.createPromoCode);
router.patch('/teaching/promo-codes/:id', adminOrInstructor, promo.updatePromoCode);
router.delete('/teaching/promo-codes/:id', adminOrInstructor, promo.deletePromoCode);

// Xabar yuborish (admin: barcha/kurs/muayyan; ustoz: faqat o'z o'quvchilari)
router.get('/notifications/audience', adminOrInstructor, notif.audience);
router.get('/notifications/sent', adminOrInstructor, notif.listSent);
router.post('/notifications', adminOrInstructor, notif.send);

// Fayl yuklash (video/PDF)
router.post('/upload', adminOrInstructor, upload.single('file'), uploadFile);
// Rasm yuklash (test savollariga skrinshot)
router.post('/upload-image', adminOrInstructor, uploadImage.single('file'), uploadImageFile);

// O'quv dasturi (kurs tuzilishi)
router.get('/courses/:id/curriculum', adminOrInstructor, cur.getCurriculum);

// Bo'limlar
router.post('/sections', adminOrInstructor, cur.createSection);
router.put('/sections/:id', adminOrInstructor, cur.updateSection);
router.delete('/sections/:id', adminOrInstructor, cur.deleteSection);

// Darslar
router.post('/lessons', adminOrInstructor, cur.createLesson);
router.put('/lessons/:id', adminOrInstructor, cur.updateLesson);
router.delete('/lessons/:id', adminOrInstructor, cur.deleteLesson);

// Klaviatura mashqi (TYPING kurslaridagi darslar uchun)
router.put('/lessons/:id/typing', adminOrInstructor, cur.saveDrill);
router.delete('/lessons/:id/typing', adminOrInstructor, cur.deleteDrill);

// Test savollari
router.post('/questions', adminOrInstructor, cur.createQuestion);
router.put('/questions/:id', adminOrInstructor, cur.updateQuestion);
router.delete('/questions/:id', adminOrInstructor, cur.deleteQuestion);

// Materiallar (video/PDF)
router.post('/materials', adminOrInstructor, cur.createMaterial);
router.delete('/materials/:id', adminOrInstructor, cur.deleteMaterial);

module.exports = router;
