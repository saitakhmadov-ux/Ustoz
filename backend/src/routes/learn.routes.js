// O'quv jarayoni yo'nalishlari
const express = require('express');
const ctrl = require('../controllers/learn.controller');
const aiCtrl = require('../controllers/ai.controller');
const { protect } = require('../middleware/auth');

const router = express.Router();

// GET /api/learn/:slug — kurs kontenti
router.get('/:slug', protect, ctrl.getCourseContent);

// POST /api/learn/:slug/mentor — kurs-doirasidagi AI Ustoz mentori (Gemini)
router.post('/:slug/mentor', protect, aiCtrl.askMentor);

module.exports = router;
