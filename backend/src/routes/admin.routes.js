// Admin yo'nalishlari
const express = require('express');
const admin = require('../controllers/admin.controller');
const cur = require('../controllers/curriculum.controller');
const notif = require('../controllers/notification.controller');
const aiAdmin = require('../controllers/ai.admin.controller');
const { uploadFile, uploadImageFile } = require('../controllers/upload.controller');
const settings = require('../controllers/settings.controller');
const { upload, uploadImage } = require('../middleware/upload');
const { protect, adminOnly, adminOrInstructor } = require('../middleware/auth');

const router = express.Router();

// Barcha admin yo'nalishlari kirishni talab qiladi
router.use(protect);

// ---- Faqat bosh admin ----
// Statistika va foydalanuvchilar
router.get('/stats', adminOnly, admin.stats);
router.get('/users', adminOnly, admin.users);
router.post('/users', adminOnly, admin.createUser);
router.delete('/users/:id', adminOnly, admin.deleteUser);

// Bosh sahifa hero rasmlari (sayt bo'ylab umumiy — faqat bosh admin)
router.get('/hero', adminOnly, settings.getHero);
router.put('/hero', adminOnly, settings.updateHero);
router.post('/hero/upload', adminOnly, uploadImage.single('file'), settings.uploadHeroImage);

// Bosh sahifa tahrirlanadigan matnlari (faqat bosh admin)
router.get('/content', adminOnly, settings.getContent);
router.put('/content', adminOnly, settings.updateContent);

// Ustoz AI boshqaruvi + analitika (faqat bosh admin)
router.get('/ai/config', adminOnly, aiAdmin.getConfig);
router.put('/ai/config', adminOnly, aiAdmin.updateConfig);
router.get('/ai/models', adminOnly, aiAdmin.listModels);
router.post('/ai/test', adminOnly, aiAdmin.testConfig);
router.get('/ai/analytics', adminOnly, aiAdmin.analytics);

// Ustoz adminlar boshqaruvi
router.get('/instructors', adminOnly, admin.listInstructors);
router.post('/instructors', adminOnly, admin.createInstructor);
router.delete('/instructors/:id', adminOnly, admin.deleteInstructor);

// ---- Bosh admin yoki biriktirilgan ustoz (egalik controllerda tekshiriladi) ----

// O'qitish statistikasi (ustozning o'z kurslari bo'yicha)
router.get('/teaching/stats', adminOrInstructor, admin.teachingStats);

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

// Test savollari
router.post('/questions', adminOrInstructor, cur.createQuestion);
router.put('/questions/:id', adminOrInstructor, cur.updateQuestion);
router.delete('/questions/:id', adminOrInstructor, cur.deleteQuestion);

// Materiallar (video/PDF)
router.post('/materials', adminOrInstructor, cur.createMaterial);
router.delete('/materials/:id', adminOrInstructor, cur.deleteMaterial);

module.exports = router;
