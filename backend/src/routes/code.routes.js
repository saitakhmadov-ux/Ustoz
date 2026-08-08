// Kod maydoni — ko'p tilli kod-ishga-tushirish (Piston orqali)
const express = require('express');
const ctrl = require('../controllers/code.controller');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/languages', protect, ctrl.listLanguages);
router.post('/run', protect, ctrl.runCode);

module.exports = router;
