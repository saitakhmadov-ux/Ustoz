// Asosiy router — barcha bo'lim routerlari shu yerga ulanadi
const express = require('express');

const router = express.Router();

// Sog'liq tekshiruvi
router.get('/health', (req, res) => {
  res.json({ success: true, message: 'Ustoz API ishlayapti', time: new Date().toISOString() });
});

// Autentifikatsiya
router.use('/auth', require('./auth.routes'));

// Bosh sahifa (ommaviy statistika va sharhlar)
router.use('/home', require('./home.routes'));

// Kategoriya va kurslar
router.use('/categories', require('./category.routes'));
router.use('/courses', require('./course.routes'));

// Yozilish, o'quv jarayoni, darslar, sertifikatlar
router.use('/enrollments', require('./enrollment.routes'));
router.use('/learn', require('./learn.routes'));
router.use('/lessons', require('./lesson.routes'));
router.use('/certificates', require('./certificate.routes'));

// AI Ustoz (feedback; mentor so'rovi /learn/:slug/mentor'da)
router.use('/ai', require('./ai.routes'));

// Kod maydoni — ko'p tilli kod-ishga-tushirish
router.use('/code', require('./code.routes'));

// To'lovlar
router.use('/payments', require('./payment.routes'));

// Foydalanuvchi profili
router.use('/me', require('./user.routes'));

// Admin panel
router.use('/admin', require('./admin.routes'));

module.exports = router;
