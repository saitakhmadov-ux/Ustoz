// Dars amallari yo'nalishlari (tugatish, test)
const express = require('express');
const ctrl = require('../controllers/learn.controller');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/:lessonId/task', protect, ctrl.completeTask);
router.post('/:lessonId/complete', protect, ctrl.completeLesson);
router.post('/:lessonId/quiz/start', protect, ctrl.startQuiz);
router.post('/:lessonId/quiz', protect, ctrl.submitQuiz);

module.exports = router;
