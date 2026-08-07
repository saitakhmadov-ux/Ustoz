// Sertifikat yo'nalishlari
const express = require('express');
const ctrl = require('../controllers/certificate.controller');

const router = express.Router();

// Ommaviy (chop etish va tekshirish)
router.get('/verify/:serial', ctrl.verifyCertificate);
router.get('/:id', ctrl.getCertificate);

module.exports = router;
