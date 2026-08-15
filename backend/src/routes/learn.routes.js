// O'quv jarayoni yo'nalishlari
const express = require('express');
const ctrl = require('../controllers/learn.controller');
const aiCtrl = require('../controllers/ai.controller');
const ielts = require('../controllers/ielts.controller');
const { protect } = require('../middleware/auth');

const router = express.Router();

// GET /api/learn/:slug — kurs kontenti
router.get('/:slug', protect, ctrl.getCourseContent);

// POST /api/learn/:slug/mentor — kurs-doirasidagi AI Ustoz mentori (Gemini)
router.post('/:slug/mentor', protect, aiCtrl.askMentor);

// IELTS mashq moduli — kurs ichida joylashgani uchun shu yerda.
// Kirish huquqi (yozilgan + muddat) har bir so'rovda tekshiriladi.
router.get('/:slug/ielts/task', protect, ielts.getTask);
router.post('/:slug/ielts/attempt', protect, ielts.submitAttempt);
router.get('/:slug/ielts/attempts', protect, ielts.myAttempts);
router.get('/:slug/ielts/attempt/:id', protect, ielts.getAttempt);
router.post('/:slug/ielts/attempt/:id/evaluate', protect, ielts.evaluateAttempt);

module.exports = router;
