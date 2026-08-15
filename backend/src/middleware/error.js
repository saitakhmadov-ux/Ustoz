// Markazlashgan xatolik ishlovchisi
const { Prisma } = require('@prisma/client');
const ApiError = require('../utils/ApiError');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Server xatoligi';

  // Zod validatsiya xatoliklari
  if (err.name === 'ZodError') {
    statusCode = 400;
    message = err.errors?.map((e) => e.message).join('; ') || 'Ma\'lumot noto\'g\'ri';
  }

  // Prisma xatoliklari
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      statusCode = 409;
      const target = err.meta?.target;
      message = `Bunday ${Array.isArray(target) ? target.join(', ') : 'qiymat'} allaqachon mavjud`;
    } else if (err.code === 'P2025') {
      statusCode = 404;
      message = 'Yozuv topilmadi';
    }
  }

  if (process.env.NODE_ENV === 'development' && statusCode === 500) {
    console.error(err);
  }

  const payload = { success: false, message };
  // Ixtiyoriy mashina-o'qiydigan kod (masalan ACCESS_EXPIRED) — frontend farqlashi uchun
  if (err.code && typeof err.code === 'string' && !/^P\d+$/.test(err.code)) {
    payload.code = err.code;
  }
  // Xatolik bilan birga qaytariladigan qo'shimcha ma'lumot (masalan
  // EMAIL_NOT_VERIFIED bilan `pendingToken`). Faqat o'z kodimiz to'ldiradi.
  if (err.data && typeof err.data === 'object') {
    Object.assign(payload, err.data);
  }
  res.status(statusCode).json(payload);
}

function notFoundHandler(req, res, next) {
  next(ApiError.notFound(`Manzil topilmadi: ${req.originalUrl}`));
}

module.exports = { errorHandler, notFoundHandler };
