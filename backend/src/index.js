// Server kirish nuqtasi
const app = require('./app');
const env = require('./config/env');
const prisma = require('./config/prisma');
const { logMailStatus } = require('./utils/mailer');
const { startBot } = require('./telegram/bot');
const { startAccessExpiryJob } = require('./jobs/accessExpiry');

async function start() {
  try {
    // Ma'lumotlar bazasiga ulanishni tekshirish
    await prisma.$connect();
    console.log('✅ Ma\'lumotlar bazasiga ulanildi');

    app.listen(env.port, () => {
      console.log(`🚀 Ustoz API ishga tushdi: http://localhost:${env.port}`);
      console.log(`   Muhit: ${env.nodeEnv}`);
      // Sozlamalar bazadan o'qiladi — server ishga tushishini kutib turmaydi
      logMailStatus().catch(() => {});
      // Token qo'yilgan bo'lsa Telegram bot ham ko'tariladi (bo'lmasa jim turadi)
      startBot().catch((err) => console.error('❌ Telegram bot:', err.message));
      // Kurs muddati tugayotganlarni ogohlantirish (kuniga ikki marta)
      startAccessExpiryJob();
    });
  } catch (err) {
    console.error('❌ Serverni ishga tushirishda xatolik:', err.message);
    process.exit(1);
  }
}

// Yumshoq to'xtatish
process.on('SIGINT', async () => {
  await require('./telegram/bot').stopBot();
  await prisma.$disconnect();
  console.log('\n👋 Server to\'xtatildi');
  process.exit(0);
});

start();
