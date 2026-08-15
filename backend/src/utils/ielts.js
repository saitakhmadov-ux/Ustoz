// IELTS mashqining sof mantiqi: so'z/belgi sanash va natijani hisoblash.
// Prisma'siz — server ham, sinovlar ham shu funksiyalardan foydalanadi.
//
// MUHIM: hisob har doim SERVERDA qayta bajariladi. Brauzer yuborgan
// so'z soni yoki tezlikka ishonilmaydi.

const { compare, normalizeText } = require('./typing');

// IELTS qoidasi: so'zlar bo'sh joy bilan ajratiladi. Defis bilan yozilgan
// so'z ("well-known") bitta so'z, raqamlar ham so'z sifatida sanaladi.
function countWords(text) {
  const s = String(text || '').trim();
  if (!s) return 0;
  return s.split(/\s+/).filter(Boolean).length;
}

function countChars(text) {
  return String(text || '').length;
}

// Yozma topshiriq (Task 1 / Task 2) natijasi.
//
// Bu yerdagi tezlik — "so'z/daqiqa", ammo unga O'YLASH vaqti ham kiradi
// (esse yozishda odam matnni to'xtab-to'xtab yozadi). Shuning uchun u
// klaviatura mashqidagi tezlik bilan solishtirilmaydi va interfeysda
// shunday izohlanadi.
function writingStats(text, durationMs, minWords = null) {
  const words = countWords(text);
  const chars = countChars(text);
  const minutes = durationMs / 60000;
  const wpm = minutes > 0 ? Math.round(words / minutes) : 0;
  return {
    words,
    chars,
    wpm,
    minWords: minWords ?? null,
    metMinWords: minWords ? words >= minWords : null,
  };
}

// Ko'chirib yozish (TYPING) va lug'at (VOCAB) natijasi.
// Aniqlik/xatolar `utils/typing.js` dagi bir xil qoida bo'yicha hisoblanadi,
// qo'shimcha ravishda to'g'ri yozilgan SO'ZLAR soni ham chiqariladi.
function copyStats(expected, typed, durationMs) {
  const exp = normalizeText(expected).trim();
  const got = normalizeText(typed).trim();
  const { correct, wrong, chars } = compare(exp, got);

  const minutes = durationMs / 60000;
  const wpm = minutes > 0 ? Math.round(correct / 5 / minutes) : 0;
  const accuracy = chars > 0 ? Math.round((correct / chars) * 100) : 0;

  // So'z darajasidagi to'g'rilik — VOCAB uchun "correct answers"
  const expWords = exp ? exp.split(/\s+/) : [];
  const gotWords = got ? got.split(/\s+/) : [];
  let correctWords = 0;
  for (let i = 0; i < gotWords.length; i += 1) {
    if (gotWords[i] === expWords[i]) correctWords += 1;
  }

  return {
    words: countWords(got),
    chars,
    wpm,
    accuracy,
    errors: wrong,
    correctWords,
    totalWords: expWords.length,
  };
}

// Ishonarli chegaralar — brauzerdan kelgan davomiylikni tekshirish
const MIN_DURATION_MS = 3000;
const MAX_DURATION_MS = 3 * 60 * 60 * 1000; // 3 soat

function validDuration(ms) {
  const n = Math.round(Number(ms));
  if (!Number.isFinite(n)) return null;
  if (n < MIN_DURATION_MS || n > MAX_DURATION_MS) return null;
  return n;
}

module.exports = {
  countWords, countChars, writingStats, copyStats, validDuration, MIN_DURATION_MS,
};
