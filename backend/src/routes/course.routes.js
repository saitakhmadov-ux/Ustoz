// Kurs yo'nalishlari
const express = require('express');
const ctrl = require('../controllers/course.controller');
const review = require('../controllers/review.controller');
const { protect, optionalAuth, adminOnly, adminOrInstructor } = require('../middleware/auth');

const router = express.Router();

// Admin/ustoz ro'yxati (dinamik :slug dan oldin turishi kerak)
router.get('/admin/all', protect, adminOrInstructor, ctrl.adminList);

// Baholar (review)
router.get('/:slug/reviews', optionalAuth, review.list);
router.post('/:slug/reviews', protect, review.upsert);
router.delete('/:slug/reviews', protect, review.remove);

// Ommaviy
router.get('/', ctrl.list);
router.get('/top', ctrl.topRated); // :slug dan oldin turishi shart
router.get('/:slug', optionalAuth, ctrl.getBySlug);

// Kurs yaratish/o'chirish/nashr — faqat bosh admin
router.post('/', protect, adminOnly, ctrl.create);
router.patch('/:id/publish', protect, adminOnly, ctrl.togglePublish);
router.delete('/:id', protect, adminOnly, ctrl.remove);

// Kurs ma'lumotini tahrirlash — bosh admin yoki biriktirilgan ustoz (egalik controllerda)
router.put('/:id', protect, adminOrInstructor, ctrl.update);

module.exports = router;
