// Fayl yuklash controlleri — yuklangan faylning URL manzilini qaytaradi
const path = require('path');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { ALLOWED } = require('../middleware/upload');

// POST /api/admin/upload — multipart/form-data, "file" maydoni
// Javob: { url, type, originalName }
const uploadFile = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('Fayl yuborilmadi');
  const ext = path.extname(req.file.originalname).toLowerCase();
  const type = ALLOWED[ext] || 'PDF';
  res.status(201).json({
    success: true,
    url: `/uploads/${req.file.filename}`,
    type,
    originalName: req.file.originalname,
  });
});

// POST /api/admin/upload-image — multipart/form-data, "file" maydoni (rasm)
// Test savollariga skrinshot qo'yish uchun. Javob: { url }
const uploadImageFile = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('Rasm yuborilmadi');
  res.status(201).json({
    success: true,
    url: `/uploads/${req.file.filename}`,
    originalName: req.file.originalname,
  });
});

module.exports = { uploadFile, uploadImageFile };
