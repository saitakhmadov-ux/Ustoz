// Erkin klaviatura mashqi (kursdan tashqari, vaqtli test)
const express = require('express');
const ctrl = require('../controllers/typing.controller');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect); // mashq natijasi hisobga bog'lanadi

router.get('/practice', ctrl.startPractice);
router.post('/practice', ctrl.submitPractice);
router.get('/records', ctrl.records);

module.exports = router;
