// Kategoriya yo'nalishlari
const express = require('express');
const ctrl = require('../controllers/category.controller');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

// Ommaviy
router.get('/', ctrl.list);
router.get('/:slug', ctrl.getBySlug);

// Admin
router.post('/', protect, adminOnly, ctrl.create);
router.put('/:id', protect, adminOnly, ctrl.update);
router.delete('/:id', protect, adminOnly, ctrl.remove);

module.exports = router;
