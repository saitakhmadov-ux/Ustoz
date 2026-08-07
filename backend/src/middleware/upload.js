// Fayl yuklash middleware (multer) — video va PDF materiallar uchun
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const ApiError = require('../utils/ApiError');

// Yuklangan fayllar shu papkada saqlanadi (loyiha ildizidagi backend/uploads)
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Ruxsat etilgan fayl turlari: kengaytma -> material turi
const ALLOWED = {
  '.mp4': 'VIDEO',
  '.webm': 'VIDEO',
  '.mov': 'VIDEO',
  '.mkv': 'VIDEO',
  '.pdf': 'PDF',
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    // Xavfsiz, noyob nom: <random>-<vaqt><kengaytma>
    const safe = `${crypto.randomBytes(8).toString('hex')}-${Date.now()}${ext}`;
    cb(null, safe);
  },
});

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED[ext]) {
    return cb(ApiError.badRequest(`Fayl turi qo'llab-quvvatlanmaydi: ${ext}. Faqat mp4, webm, mov, mkv, pdf.`));
  }
  cb(null, true);
}

// Bitta fayl, "file" maydoni. Maksimal 500MB (video uchun).
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 500 * 1024 * 1024 },
});

// ---- Rasm yuklash (bosh sahifa hero va shu kabi) ----
const IMAGE_ALLOWED = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

function imageFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!IMAGE_ALLOWED.includes(ext)) {
    return cb(ApiError.badRequest(`Rasm turi qo'llab-quvvatlanmaydi: ${ext}. Faqat jpg, jpeg, png, webp, gif.`));
  }
  cb(null, true);
}

// Bitta rasm, "file" maydoni. Maksimal 10MB.
const uploadImage = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

module.exports = { upload, uploadImage, UPLOAD_DIR, ALLOWED, IMAGE_ALLOWED };
