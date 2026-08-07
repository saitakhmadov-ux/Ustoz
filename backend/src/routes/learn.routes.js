// O'quv jarayoni yo'nalishlari
const express = require('express');
const ctrl = require('../controllers/learn.controller');
const { protect } = require('../middleware/auth');

const router = express.Router();

// GET /api/learn/:slug — kurs kontenti
router.get('/:slug', protect, ctrl.getCourseContent);

module.exports = router;
