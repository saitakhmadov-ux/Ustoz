// Bosh sahifa (ommaviy) yo'nalishlari
const express = require('express');
const home = require('../controllers/home.controller');
const settings = require('../controllers/settings.controller');

const router = express.Router();

router.get('/stats', home.stats);
router.get('/reviews', home.featuredReviews);
// Bosh sahifa hero rasmlari (ommaviy)
router.get('/hero', settings.getHero);
// Bosh sahifa tahrirlanadigan matnlari (ommaviy)
router.get('/content', settings.getContent);
// "Biz haqimizda" sahifasi mazmuni (ommaviy)
router.get('/about', settings.getAbout);

module.exports = router;
