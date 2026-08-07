// To'lov yo'nalishlari
const express = require('express');
const ctrl = require('../controllers/payment.controller');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/', protect, ctrl.createPayment);
router.get('/my', protect, ctrl.myPayments);
router.get('/:id', protect, ctrl.getReceipt);

module.exports = router;
