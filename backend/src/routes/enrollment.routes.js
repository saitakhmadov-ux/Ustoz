// Yozilish yo'nalishlari
const express = require('express');
const ctrl = require('../controllers/enrollment.controller');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/', protect, ctrl.enroll);
router.get('/my', protect, ctrl.myEnrollments);

module.exports = router;
