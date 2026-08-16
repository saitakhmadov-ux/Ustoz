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

// Fayl turi bo'yicha maksimal hajm (bayt).
// PDF materiallar hosting joyini tez to'ldirmasligi uchun atigi 2MB —
// bundan kattasini tizim qabul qilmaydi (yuklash yarim yo'lda to'xtatiladi).
const SIZE_LIMITS = {
  VIDEO: 500 * 1024 * 1024,
  PDF: 2 * 1024 * 1024,
  IMAGE: 10 * 1024 * 1024,
};

// Eng katta chegara — multer uchun umumiy "shift" (tur bo'yicha aniq
// chegarani quyidagi storage o'zi tekshiradi).
const MAX_LIMIT = Math.max(...Object.values(SIZE_LIMITS));

function mb(bytes) {
  const v = bytes / (1024 * 1024);
  return Number.isInteger(v) ? `${v} MB` : `${v.toFixed(1)} MB`;
}

/**
 * Multer storage: faylni diskka yozadi va bir vaqtning o'zida baytlarni
 * sanaydi. Chegaradan oshsa — yozishni to'xtatib, yarim faylni o'chiradi va
 * xatolik qaytaradi. Shu tufayli katta PDF butunlay yuklanib bo'lguncha
 * kutilmaydi, diskda ham iz qolmaydi.
 *
 * kindFor(ext) — fayl turini ('VIDEO' | 'PDF' | 'IMAGE') qaytaradi.
 */
function limitedDiskStorage(kindFor) {
  return {
    _handleFile(req, file, cb) {
      const ext = path.extname(file.originalname).toLowerCase();
      const kind = kindFor(ext);
      const limit = SIZE_LIMITS[kind] || SIZE_LIMITS.PDF;

      // Xavfsiz, noyob nom: <random>-<vaqt><kengaytma>
      const filename = `${crypto.randomBytes(8).toString('hex')}-${Date.now()}${ext}`;
      const filePath = path.join(UPLOAD_DIR, filename);
      const out = fs.createWriteStream(filePath);

      let bytes = 0;
      let finished = false;

      const fail = (err) => {
        if (finished) return;
        finished = true;
        file.stream.unpipe(out);
        out.destroy();
        // Yarim yozilgan faylni o'chiramiz — hosting joyi band bo'lib qolmasin
        fs.unlink(filePath, () => cb(err));
      };

      file.stream.on('data', (chunk) => {
        bytes += chunk.length;
        if (bytes > limit) {
          fail(ApiError.payloadTooLarge(
            `${kind === 'PDF' ? 'PDF' : 'Fayl'} hajmi ${mb(limit)} dan oshmasligi kerak.`,
          ));
        }
      });
      file.stream.on('error', fail);
      out.on('error', fail);
      out.on('finish', () => {
        if (finished) return;
        finished = true;
        cb(null, {
          destination: UPLOAD_DIR, filename, path: filePath, size: bytes,
        });
      });

      file.stream.pipe(out);
    },

    _removeFile(req, file, cb) {
      fs.unlink(file.path, cb);
    },
  };
}

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED[ext]) {
    return cb(ApiError.badRequest(`Fayl turi qo'llab-quvvatlanmaydi: ${ext}. Faqat mp4, webm, mov, mkv, pdf.`));
  }
  cb(null, true);
}

// Bitta fayl, "file" maydoni. Video 500MB gacha, PDF esa 2MB gacha.
const upload = multer({
  storage: limitedDiskStorage((ext) => ALLOWED[ext]),
  fileFilter,
  limits: { fileSize: MAX_LIMIT },
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
  storage: limitedDiskStorage(() => 'IMAGE'),
  fileFilter: imageFilter,
  limits: { fileSize: SIZE_LIMITS.IMAGE },
});

module.exports = {
  upload, uploadImage, UPLOAD_DIR, ALLOWED, IMAGE_ALLOWED, SIZE_LIMITS,
};
