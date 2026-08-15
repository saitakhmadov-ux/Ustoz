// Klaviatura mashqining sof mantiqi: matnni solishtirish va natijani hisoblash.
//
// Bu fayl prisma'siz va brauzersiz — shuning uchun server ham, sinovlar ham
// bir xil qoidalardan foydalanadi. Brauzerdagi juftligi: frontend/lib/typing.js
// (o'zgartirilsa IKKALASI ham yangilanishi kerak).
//
// MUHIM: natija brauzerda hisoblanadi, ammo unga ishonmaymiz — server yozilgan
// matnni mashq matni bilan qaytadan solishtiradi va WPM/aniqlikni o'zi chiqaradi.

// O'zbek lotin yozuvida "oʻ", "gʻ" va tutuq belgisi turli belgilar bilan
// yoziladi: ʻ (U+02BB), ʼ (U+02BC), ' (U+2018), ' (U+2019), oddiy ' va `.
// Klaviaturada odam odatda oddiy ' bosadi — hammasini bitta belgiga keltiramiz,
// aks holda to'g'ri yozgan odam xato olib qolardi.
const APOSTROPHES = /[ʻʼ‘’‛`´']/g;
const APOSTROPHE = 'ʻ';

// Ko'rinmas/takroriy bo'shliqlarni ham tenglashtiramiz (nusxa-ko'chirilgan
// matnlarda uchraydi): NBSP, tab va ketma-ket probellar -> bitta oddiy probel.
function normalizeText(s) {
  return String(s == null ? '' : s)
    .replace(APOSTROPHES, APOSTROPHE)
    .replace(/[   \t]/g, ' ')
    .replace(/\r\n?/g, '\n');
}

// Solishtirish uchun bitta belgi (mashq matni ham, yozilgani ham shundan o'tadi)
function normalizeChar(ch) {
  return normalizeText(ch);
}

// Mashq matnini tozalash: qatorlar bo'shliqqa aylanadi, ketma-ket probellar
// bittaga tushadi, chetlari kesiladi. Pleer ham, server ham shu matn bilan ishlaydi.
function normalizeDrill(text) {
  return normalizeText(text).replace(/\s+/g, ' ').trim();
}

// TIMED rejimida matn belgilangan davomiylikka yetmasligi mumkin — takrorlaymiz.
// Qaytaradi: kamida `minChars` uzunlikdagi matn.
function expandDrill(text, minChars) {
  const base = normalizeDrill(text);
  if (!base || !minChars || base.length >= minChars) return base;
  let out = base;
  while (out.length < minChars) out += ` ${base}`;
  return out;
}

// Yozilgan matnni mashq matni bilan belgi-belgi solishtiradi.
// Qaytaradi: { correct, wrong, chars, missing } — `chars` yozilgan belgilar soni.
function compare(expected, typed) {
  const exp = normalizeText(expected);
  const got = normalizeText(typed);
  let correct = 0;
  let wrong = 0;
  for (let i = 0; i < got.length; i += 1) {
    if (i < exp.length && got[i] === exp[i]) correct += 1;
    else wrong += 1;
  }
  return {
    correct,
    wrong,
    chars: got.length,
    missing: Math.max(0, exp.length - got.length),
  };
}

// Standart WPM: to'g'ri yozilgan belgilar / 5 / daqiqa ("so'z" = 5 belgi).
function wpmOf(correctChars, durationMs) {
  const minutes = durationMs / 60000;
  if (!(minutes > 0)) return 0;
  return Math.round(correctChars / 5 / minutes);
}

// Aniqlik: to'g'ri belgilarning yozilganlarga nisbati (foiz).
function accuracyOf(correct, chars) {
  if (chars <= 0) return 0;
  return Math.round((correct / chars) * 100);
}

// Ishonarli chegaralar — brauzerdan kelgan davomiylikni tekshirish uchun.
const MAX_WPM = 220; // dunyo rekordi ~215; undan yuqorisi — soxta natija
const MIN_DURATION_MS = 1000;

// Urinishni yakuniy baholash.
//   expected     — mashq matni
//   typed        — foydalanuvchi yozgan matn
//   durationMs   — brauzer o'lchagan vaqt
//   serverMs     — server o'lchagan vaqt (start -> submit oralig'i)
//   target       — { targetWpm, targetAccuracy }
//   timedMs      — TIMED mashq davomiyligi. Berilsa, mashq "yakunlandi"
//                  hisoblanishi uchun matnni oxirigacha emas, shu vaqtni
//                  to'ldirish kifoya (matn ataylab uzunroq beriladi).
// Qaytaradi: { ok, reason?, result? }
function gradeAttempt({
  expected, typed, durationMs, serverMs, targetWpm = 0, targetAccuracy = 0, timedMs = null,
}) {
  const exp = normalizeDrill(expected);
  const got = normalizeText(typed).trim();

  if (!exp) return { ok: false, reason: 'no-drill' };
  if (!got) return { ok: false, reason: 'empty' };

  const ms = Math.round(Number(durationMs));
  if (!Number.isFinite(ms) || ms < MIN_DURATION_MS) {
    return { ok: false, reason: 'duration' };
  }
  // Brauzer o'zi o'lchagan vaqtni qisqartirib yuborishi mumkin — server
  // o'lchagan oraliqdan uzunroq bo'lsa (kichik zaxira bilan) rad etamiz.
  if (Number.isFinite(serverMs) && ms > serverMs + 5000) {
    return { ok: false, reason: 'duration' };
  }

  const { correct, wrong, chars } = compare(exp, got);
  const wpm = wpmOf(correct, ms);
  if (wpm > MAX_WPM) return { ok: false, reason: 'impossible' };

  const accuracy = accuracyOf(correct, chars);
  // Mashq oxirigacha yozilishi shart — yarmida to'xtab "tez yozdim" deb
  // bo'lmaydi. 2 ta belgi zaxira: oxirgi probel/nuqta yozilmay qolishi mumkin.
  // TIMED mashqda esa matn ataylab uzun: vaqtni to'ldirish yetarli.
  const finished = timedMs
    ? ms >= timedMs - 1500
    : chars >= exp.length - 2;

  const passed = finished && wpm >= targetWpm && accuracy >= targetAccuracy;

  return {
    ok: true,
    result: {
      wpm, accuracy, chars, errors: wrong, durationMs: ms, finished, passed,
    },
  };
}

module.exports = {
  APOSTROPHE,
  normalizeText,
  normalizeChar,
  normalizeDrill,
  expandDrill,
  compare,
  wpmOf,
  accuracyOf,
  gradeAttempt,
  MAX_WPM,
};
