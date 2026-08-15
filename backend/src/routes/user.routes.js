// Foydalanuvchi (me) yo'nalishlari
const express = require('express');
const ctrl = require('../controllers/user.controller');
const notif = require('../controllers/notification.controller');
const { myCertificates } = require('../controllers/certificate.controller');
const telegram = require('../controllers/telegram.controller');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect); // barcha /me yo'nalishlari himoyalangan

router.put('/', ctrl.updateProfile);
router.put('/password', ctrl.changePassword);
router.get('/stats', ctrl.myStats);
router.get('/certificates', myCertificates);

// Telegram bog'lanishi (ulash havolasi / uzish)
router.get('/telegram', telegram.status);
router.post('/telegram/link', telegram.createLink);
// Telegram Mini App ichidan ulash (botdagi "Hisobni ulash" tugmasi)
router.post('/telegram/webapp-link', telegram.webappLink);
router.delete('/telegram', telegram.unlink);

// Bildirishnoma sozlamalari (qaysi hodisalar Telegram'ga yuborilsin)
router.get('/notify-prefs', ctrl.notifyPrefs);
router.put('/notify-prefs', ctrl.saveNotifyPrefs);

// Bildirishnomalar
router.get('/notifications', notif.listMine);
router.get('/notifications/unread-count', notif.unreadCount);
router.post('/notifications/:id/read', notif.markRead);
router.post('/notifications/read-all', notif.markAllRead);

module.exports = router;
