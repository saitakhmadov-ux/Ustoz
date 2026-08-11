// Express ilovasini sozlash
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const env = require('./config/env');
const routes = require('./routes');
const telegram = require('./telegram/bot');
const { errorHandler, notFoundHandler } = require('./middleware/error');
const { apiLimiter } = require('./middleware/rateLimit');

const app = express();

// Railway/Vercel proxy ortida turadi — haqiqiy mijoz IP si X-Forwarded-For da
// keladi. Busiz rate limit hamma so'rovni bitta IP deb hisoblaydi.
app.set('trust proxy', 1);

// Xavfsizlik sarlavhalari. Yuklangan fayllar boshqa domendan (frontend)
// ko'rsatilgani uchun cross-origin resurslarga ruxsat beramiz.
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false, // API JSON qaytaradi, sahifa render qilmaydi
}));

// Middleware
// CLIENT_URL bir nechta manbani vergul bilan qabul qiladi
// (masalan: "http://localhost:3000,https://ustoz.vercel.app")
const allowedOrigins = String(env.clientUrl)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
app.use(
  cors({
    origin(origin, cb) {
      // Origin bo'lmasa (server-server, curl) yoki ruxsat etilgan ro'yxatda bo'lsa — ruxsat
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS: ruxsat etilmagan manba: ${origin}`));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
if (env.nodeEnv === 'development') {
  app.use(morgan('dev'));
}

// Yuklangan fayllar (video/PDF materiallar) — ochiq statik
app.use(
  '/uploads',
  express.static(path.join(__dirname, '..', 'uploads'), {
    setHeaders: (res) => res.set('Access-Control-Allow-Origin', '*'),
  })
);

// Telegram webhook — umumiy chastota chegarasidan OLDIN turadi, chunki
// Telegram bir vaqtda ko'p yangilanish yuborishi mumkin va ular bloklanmasligi
// kerak. So'rov haqiqiyligi maxfiy sarlavha orqali tekshiriladi (bot.js).
app.post(telegram.WEBHOOK_PATH, (req, res) => telegram.handleWebhook(req, res));

// API yo'nalishlari (umumiy chastota chegarasi bilan; auth uchun
// qat'iyroq cheklovlar auth.routes.js da alohida qo'yilgan)
app.use('/api', apiLimiter, routes);

// Xatolik ishlovchilar (eng oxirida)
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
