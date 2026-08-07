// Express ilovasini sozlash
const path = require('path');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const env = require('./config/env');
const routes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middleware/error');

const app = express();

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

// API yo'nalishlari
app.use('/api', routes);

// Xatolik ishlovchilar (eng oxirida)
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
