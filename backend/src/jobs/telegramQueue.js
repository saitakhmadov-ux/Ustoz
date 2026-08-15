// Telegram xabarlari navbati — tezlikni saqlab yuboradi va uzilishda qayta uradi.
//
// Nega kerak: Telegram sekundiga ~30 xabarni qabul qiladi, undan oshsa 429
// ("retry after N") qaytaradi. Ilgari ommaviy yuborish so'rov ichida, 25 talik
// guruhlarda ketardi: admin javobni kutib turardi va bitta uzilish xabarlarni
// yo'qotardi. Endi xabar `TelegramOutbox` ga yoziladi, so'rov darhol tugaydi,
// yuborishni esa shu vazifa bajaradi.
//
// Qoidalar:
//   - muvaffaqiyatli yuborilgan qator O'CHIRILADI (jadval o'smaydi)
//   - bot bloklangan/chat topilmagan bo'lsa qayta urinilmaydi, foydalanuvchining
//     Telegram bog'lanishi ham tozalanadi
//   - 429 bo'lsa Telegram aytgan vaqt kutiladi (butun navbat pauza qiladi)
//   - boshqa xatolarda o'sib boruvchi kechikish bilan 5 martagacha urinib ko'riladi
const prisma = require('../config/prisma');
const { sendMessage } = require('../telegram/bot');

const BATCH = 20; // bir yurishda nechta xabar (Telegram chegarasi ~30/sek)
const TICK_MS = 1000;
const MAX_ATTEMPTS = 5;
// Qator olinganda "band" qilib qo'yiladi — ikkinchi jarayon uni takror olmasin
const CLAIM_MS = 60 * 1000;

// Qayta urinishlar orasidagi kechikish: 30s, 1m, 2m, 4m (ko'pi bilan 30 daqiqa)
const backoffMs = (attempts) => Math.min(30_000 * 2 ** (attempts - 1), 30 * 60_000);

// Qayta urinishdan foyda yo'q bo'lgan holatlar
const PERMANENT = /blocked|chat not found|deactivated|kicked|user is deleted|bot can't initiate/i;
const isPermanent = (res) => res.code === 403 || PERMANENT.test(res.error || '');

let timer = null;
let running = false;
let pauseUntil = 0; // 429 kelganda butun navbat shu vaqtgacha kutadi

// Xabarni navbatga qo'yish. chatId bo'lmasa jimgina o'tkazib yuboriladi.
async function enqueue(chatId, text, extra = null) {
  if (!chatId || !text) return null;
  return prisma.telegramOutbox.create({
    data: { chatId: String(chatId), text, extra: extra || undefined },
  });
}

// Ommaviy qo'shish: [{ chatId, text, extra? }]
async function enqueueMany(items) {
  const rows = items
    .filter((i) => i.chatId && i.text)
    .map((i) => ({ chatId: String(i.chatId), text: i.text, extra: i.extra || undefined }));
  if (!rows.length) return 0;
  const res = await prisma.telegramOutbox.createMany({ data: rows });
  return res.count;
}

const drop = (id) => prisma.telegramOutbox.delete({ where: { id } }).catch(() => {});

// Bot bloklangan — bu chatga boshqa urinmaymiz va bog'lanishni uzamiz
async function unlinkChat(chatId) {
  await prisma.user.updateMany({
    where: { telegramChatId: String(chatId) },
    data: { telegramChatId: null, telegramUsername: null, telegramLinkedAt: null },
  });
}

async function deliver(row) {
  const res = await sendMessage(row.chatId, row.text, row.extra || {});
  if (res.sent) return drop(row.id);

  if (isPermanent(res)) {
    await unlinkChat(row.chatId);
    return drop(row.id);
  }

  // 429: Telegram o'zi qancha kutishni aytadi — butun navbat shuncha pauza qiladi
  if (res.retryAfter) {
    pauseUntil = Math.max(pauseUntil, Date.now() + res.retryAfter * 1000);
  }

  const attempts = row.attempts + 1;
  if (attempts >= MAX_ATTEMPTS) {
    console.error(`📭 Telegram xabari yetkazilmadi (${row.chatId}): ${res.error}`);
    return drop(row.id);
  }

  const delay = res.retryAfter ? res.retryAfter * 1000 + 500 : backoffMs(attempts);
  return prisma.telegramOutbox.update({
    where: { id: row.id },
    data: {
      attempts,
      lastError: String(res.error || '').slice(0, 300),
      nextTryAt: new Date(Date.now() + delay),
    },
  }).catch(() => {});
}

// Bir yurish: vaqti kelgan xabarlarni oladi va yuboradi.
// Qaytaradi: nechta xabar olinganini (sinovlar uchun).
async function runOnce() {
  if (Date.now() < pauseUntil) return 0;

  const rows = await prisma.telegramOutbox.findMany({
    where: { nextTryAt: { lte: new Date() } },
    orderBy: { nextTryAt: 'asc' },
    take: BATCH,
  });
  if (!rows.length) return 0;

  // Band qilib qo'yamiz: ikkinchi nusxa (yoki keyingi tick) shu qatorlarni
  // qaytadan olib, xabarni ikki marta yubormasin
  await prisma.telegramOutbox.updateMany({
    where: { id: { in: rows.map((r) => r.id) } },
    data: { nextTryAt: new Date(Date.now() + CLAIM_MS) },
  });

  await Promise.all(rows.map((row) => deliver(row).catch((err) => {
    console.error('Telegram navbatida xatolik:', err.message);
  })));
  return rows.length;
}

function startTelegramQueue() {
  if (timer) return;
  const tick = async () => {
    if (running) return; // oldingi yurish tugamagan
    running = true;
    try {
      await runOnce();
    } catch (err) {
      console.error('Telegram navbat vazifasida xatolik:', err.message);
    } finally {
      running = false;
    }
  };

  timer = setInterval(tick, TICK_MS);
  if (typeof timer.unref === 'function') timer.unref();
}

function stopTelegramQueue() {
  if (timer) clearInterval(timer);
  timer = null;
}

module.exports = {
  enqueue, enqueueMany, runOnce, startTelegramQueue, stopTelegramQueue, MAX_ATTEMPTS,
};
