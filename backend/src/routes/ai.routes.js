// AI Ustoz — umumiy yo'nalishlar (feedback). Mentor so'rovi learn.routes'da (kurs-doirasida).
const express = require('express');
const aiCtrl = require('../controllers/ai.controller');
const { protect } = require('../middleware/auth');

const router = express.Router();

// POST /api/ai/feedback — javob foydali bo'ldimi (👍/👎)
router.post('/feedback', protect, aiCtrl.submitFeedback);

module.exports = router;
