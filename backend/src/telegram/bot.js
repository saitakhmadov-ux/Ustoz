// Telegram bot — ishga tushirish, to'xtatish va holatini kuzatish.
//
// Token admin panelidan (SiteSetting → telegram_config) olinadi, shuning uchun
// bot serverni qayta ishga tushirmasdan yoqiladi/o'chiriladi (restart()).
//
// Ikki rejim:
//   webhook — ommaviy manzil bo'lsa (Railway). Telegram o'zi so'rov yuboradi.
//   polling — lokal ishlab chiqishda (localhost'ga Telegram kira olmaydi).
const crypto = require('crypto');
const { Telegraf } = require('telegraf');
const env = require('../config/env');
const {
  getSetting, setSetting, getTelegramConfig, TELEGRAM_CONFIG_KEY,
} = require('../utils/settings');
const registerHandlers = require('./handlers');

const WEBHOOK_PATH = '/api/telegram/webhook';

const BOT_COMMANDS = [
  { command: 'ulash', description: 'Hisobni botga ulash' },
  { command: 'kurslar', description: 'Barcha kurslar va narxlari' },
  { command: 'kurslarim', description: 'Kurslarim va progress' },
  { command: 'sertifikatlarim', description: 'Olingan sertifikatlarim' },
  { command: 'ustoz', description: 'AI Ustozdan savol so\'rash' },
  { command: 'tugat', description: 'AI suhbatini yakunlash' },
  { command: 'yordam', description: 'Buyruqlar ro\'yxati' },
  { command: 'uzish', description: 'Hisobni botdan uzish' },
];

// Joriy holat. bot=null bo'lsa bot ishlamayapti.
let state = {
  bot: null,
  mode: null, // 'webhook' | 'polling'
  username: '',
  startedAt: null,
  error: null,
  reason: 'no-token', // nega ishlamayapti: 'no-token' | 'disabled' | 'error'
};

// Panelga ko'rsatiladigan qisqa holat
function getStatus() {
  return {
    running: Boolean(state.bot),
    mode: state.mode,
    username: state.username,
    startedAt: state.startedAt,
    error: state.error,
    reason: state.bot ? null : state.reason,
  };
}

// Webhook maxfiy kaliti — Telegram har so'rovda sarlavhada qaytaradi, biz
// shuni tekshiramiz. Bir marta yaratiladi va sozlamalarda saqlanadi.
async function ensureWebhookSecret() {
  const cfg = (await getSetting(TELEGRAM_CONFIG_KEY, {})) || {};
  if (typeof cfg.webhookSecret === 'string' && cfg.webhookSecret) return cfg.webhookSecret;
  const secret = crypto.randomBytes(24).toString('hex');
  await setSetting(TELEGRAM_CONFIG_KEY, { ...cfg, webhookSecret: secret });
  return secret;
}

// Bot nomini sozlamalarga yozamiz — ulash havolasi (t.me/<nom>) shundan quriladi
async function saveBotUsername(username) {
  const cfg = (await getSetting(TELEGRAM_CONFIG_KEY, {})) || {};
  if (cfg.botUsername === username) return;
  await setSetting(TELEGRAM_CONFIG_KEY, { ...cfg, botUsername: username });
}

async function stopBot() {
  if (!state.bot) return;
  try {
    state.bot.stop('qayta ishga tushirish');
  } catch { /* hali ishga tushmagan bo'lishi mumkin — e'tiborsiz */ }
  state = { ...state, bot: null, mode: null, startedAt: null };
}

// Botni ishga tushiradi. Token yo'q/o'chirilgan bo'lsa jimgina to'xtaydi —
// bu xato emas, shunchaki bot hali sozlanmagan.
async function startBot() {
  await stopBot();

  const cfg = await getTelegramConfig();
  if (!cfg.token) {
    state = { ...state, error: null, reason: 'no-token' };
    return getStatus();
  }
  if (!cfg.enabled) {
    state = { ...state, error: null, reason: 'disabled' };
    return getStatus();
  }

  const bot = new Telegraf(cfg.token);
  registerHandlers(bot);

  try {
    // Token to'g'riligini darrov tekshiramiz (noto'g'ri bo'lsa shu yerda bilinadi)
    const me = await bot.telegram.getMe();
    await saveBotUsername(me.username || '');
    // Telegram menyusidagi buyruqlar ro'yxati. Ustoz buyruqlari (/maosh,
    // /oquvchilarim) bu yerda yo'q — ular hammaga ko'rinmasligi uchun faqat
    // /yordam javobida (rolga qarab) chiqadi.
    await bot.telegram.setMyCommands(BOT_COMMANDS).catch(() => {});

    let mode;
    if (env.publicUrl) {
      const secret = await ensureWebhookSecret();
      await bot.telegram.setWebhook(`${env.publicUrl}${WEBHOOK_PATH}`, {
        secret_token: secret,
        drop_pending_updates: true,
      });
      mode = 'webhook';
    } else {
      // Lokalda: eski webhook qolib ketmasin, so'ng polling
      await bot.telegram.deleteWebhook({ drop_pending_updates: true });
      // launch() bot to'xtaguncha tugamaydi — shuning uchun kutmaymiz
      bot.launch().catch((err) => {
        console.error('❌ Telegram polling xatosi:', err.message);
        state = { ...state, bot: null, error: err.message, reason: 'error' };
      });
      mode = 'polling';
    }

    state = {
      bot,
      mode,
      username: me.username || '',
      startedAt: new Date(),
      error: null,
      reason: null,
    };
    console.log(`🤖 Telegram bot ishga tushdi: @${me.username} (${mode})`);
  } catch (err) {
    state = {
      ...state, bot: null, mode: null, error: err.message, reason: 'error',
    };
    console.error('❌ Telegram botni ishga tushirib bo\'lmadi:', err.message);
  }

  return getStatus();
}

// Sozlama o'zgargach chaqiriladi (panelda token almashtirilganda)
const restartBot = () => startBot();

// Express'dan keladigan webhook so'rovi.
// Maxfiy sarlavha mos kelmasa — bu Telegram emas, rad etamiz.
async function handleWebhook(req, res) {
  if (!state.bot) return res.sendStatus(503);
  const cfg = await getTelegramConfig();
  const got = req.get('x-telegram-bot-api-secret-token');
  if (!cfg.webhookSecret || got !== cfg.webhookSecret) return res.sendStatus(401);
  return state.bot.handleUpdate(req.body, res);
}

// Bitta xabar yuborish. Foydalanuvchi botni bloklagan bo'lsa xato qaytadi,
// ammo ilova to'xtamaydi.
async function sendMessage(chatId, text, extra = {}) {
  if (!state.bot) return { sent: false, error: 'Bot ishlamayapti' };
  if (!chatId) return { sent: false, error: 'chatId yo\'q' };
  try {
    await state.bot.telegram.sendMessage(String(chatId), text, {
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
      ...extra,
    });
    return { sent: true };
  } catch (err) {
    return { sent: false, error: err.message };
  }
}

module.exports = {
  startBot, stopBot, restartBot, getStatus, handleWebhook, sendMessage, WEBHOOK_PATH,
};
