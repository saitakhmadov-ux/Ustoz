// Boshqariladigan API xatolik klassi
class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(msg = "Noto'g'ri so'rov") {
    return new ApiError(400, msg);
  }
  static unauthorized(msg = 'Avtorizatsiyadan o\'tilmagan') {
    return new ApiError(401, msg);
  }
  static forbidden(msg = 'Ruxsat yo\'q') {
    return new ApiError(403, msg);
  }
  static notFound(msg = 'Topilmadi') {
    return new ApiError(404, msg);
  }
  static conflict(msg = 'Ziddiyat yuz berdi') {
    return new ApiError(409, msg);
  }
}

module.exports = ApiError;
