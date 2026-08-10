// To'lov yo'nalishlari
const express = require('express');
const ctrl = require('../controllers/payment.controller');
const promo = require('../controllers/promo.controller');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Checkout'da promo kodni tekshirish (chegirmali narxni qaytaradi).
// ":id" dan oldin turishi shart, aks holda "promo" id sifatida o'qiladi.
router.post('/promo/validate', protect, promo.validatePromoCode);

router.post('/', protect, ctrl.createPayment);
router.get('/my', protect, ctrl.myPayments);
router.get('/:id', protect, ctrl.getReceipt);

module.exports = router;
