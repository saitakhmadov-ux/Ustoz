// Klaviatura mashqi uchun umumiy yordamchilar (brauzer tomoni).
//
// MUHIM: solishtirish va hisoblash qoidalari backend/src/utils/typing.js bilan
// AYNAN bir xil boʻlishi kerak — aks holda ekranda koʻringan natija server
// bergan natijadan farq qiladi. Biri oʻzgarsa, ikkinchisi ham oʻzgartiriladi.

// Oʻzbek lotinidagi apostrof variantlari (oʻ, gʻ, tutuq belgisi) — hammasi
// bitta belgiga keltiriladi, shuning uchun odam oddiy ' bossa ham toʻgʻri.
const APOSTROPHES = /[ʻʼ‘’‛`´']/g;
export const APOSTROPHE = 'ʻ';

export function normalizeText(s) {
  return String(s == null ? '' : s)
    .replace(APOSTROPHES, APOSTROPHE)
    .replace(/[   \t]/g, ' ')
    .replace(/\r\n?/g, '\n');
}

export const normalizeChar = (ch) => normalizeText(ch);

// Standart oʻlchov: "soʻz" = 5 belgi
export function wpmOf(correctChars, durationMs) {
  const minutes = durationMs / 60000;
  if (!(minutes > 0)) return 0;
  return Math.round(correctChars / 5 / minutes);
}

export function accuracyOf(correct, chars) {
  if (chars <= 0) return 100;
  return Math.round((correct / chars) * 100);
}

// Yozilgan matnni mashq matni bilan solishtiradi (server bilan bir xil qoida:
// hisob YAKUNIY matn boʻyicha — xatoni tuzatsangiz aniqlik tiklanadi).
export function compare(expected, typed) {
  const exp = normalizeText(expected);
  const got = normalizeText(typed);
  let correct = 0;
  for (let i = 0; i < got.length; i += 1) {
    if (i < exp.length && got[i] === exp[i]) correct += 1;
  }
  return { correct, wrong: got.length - correct, chars: got.length };
}

// ---------- Matnni qatorlarga boʻlish ----------
// Uzun matnni (ayniqsa vaqtli mashqda) toʻliq chizmaymiz: soʻzlar boʻyicha
// qatorlarga boʻlib, faqat joriy qator atrofini koʻrsatamiz.
// MUHIM: qatorlar matnni QOLDIRMASDAN qoplaydi — qator oxiridagi probel ham
// oʻsha qatorga kiradi. Aks holda kursor qator chegarasida koʻrinmay qolardi
// (odam probel bosishi kerakligini bilmaydi).
export function splitLines(text, perLine = 52) {
  const s = String(text || '');
  const lines = [];
  let start = 0;

  while (start < s.length) {
    let end = Math.min(s.length, start + perLine);
    if (end < s.length) {
      // Soʻz oʻrtasidan uzmaymiz: oxirgi probelgacha qaytamiz va probelni
      // shu qatorda qoldiramiz
      const cut = s.lastIndexOf(' ', end);
      if (cut > start) end = cut + 1;
    }
    lines.push({ start, text: s.slice(start, end), end });
    start = end;
  }

  return lines.length ? lines : [{ start: 0, text: '', end: 0 }];
}

// Kursor qaysi qatorda ekanini topadi (end — chegaradan tashqari indeks)
export function lineIndexAt(lines, index) {
  for (let i = 0; i < lines.length; i += 1) {
    if (index < lines[i].end) return i;
  }
  return Math.max(0, lines.length - 1);
}

// ---------- Klaviatura tasviri ----------

// Fizik tugmalar (AQSh/QWERTY — oʻzbek lotin yozuvi shu joylashuvda yoziladi)
export const KEY_ROWS = [
  ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='],
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'"],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/'],
];

// Shift bilan chiqadigan belgilar: belgi -> asosiy tugma
const SHIFTED = {
  '~': '`', '!': '1', '@': '2', '#': '3', $: '4', '%': '5', '^': '6', '&': '7',
  '*': '8', '(': '9', ')': '0', _: '-', '+': '=', '{': '[', '}': ']', ':': ';',
  '"': "'", '<': ',', '>': '.', '?': '/', '|': '\\',
};

// Belgidan fizik tugmani topadi. Qaytaradi: { key, shift }
export function keyForChar(ch) {
  if (!ch) return null;
  if (ch === ' ') return { key: ' ', shift: false };
  // Apostrofning barcha koʻrinishlari — bitta ' tugmasi
  if (APOSTROPHES.test(ch)) {
    APOSTROPHES.lastIndex = 0;
    return { key: "'", shift: false };
  }
  const lower = ch.toLowerCase();
  if (lower !== ch) return { key: lower, shift: true }; // katta harf
  if (SHIFTED[ch]) return { key: SHIFTED[ch], shift: true };
  return { key: ch, shift: false };
}

// Barmoqlar taqsimoti (rang va koʻrsatma uchun)
const FINGER_KEYS = {
  'chap-jimjiloq': ['`', '1', 'q', 'a', 'z'],
  'chap-nomsiz': ['2', 'w', 's', 'x'],
  "chap-oʻrta": ['3', 'e', 'd', 'c'],
  "chap-koʻrsatkich": ['4', '5', 'r', 't', 'f', 'g', 'v', 'b'],
  "oʻng-koʻrsatkich": ['6', '7', 'y', 'u', 'h', 'j', 'n', 'm'],
  "oʻng-oʻrta": ['8', 'i', 'k', ','],
  "oʻng-nomsiz": ['9', 'o', 'l', '.'],
  "oʻng-jimjiloq": ['0', '-', '=', 'p', '[', ']', ';', "'", '/'],
  'bosh barmoq': [' '],
};

export const FINGER_OF = Object.entries(FINGER_KEYS).reduce((acc, [finger, keys]) => {
  keys.forEach((k) => { acc[k] = finger; });
  return acc;
}, {});

// Barmoq -> Tailwind rang sinfi (klaviatura tasvirida)
export const FINGER_COLOR = {
  'chap-jimjiloq': 'bg-rose-100 text-rose-700',
  'chap-nomsiz': 'bg-amber-100 text-amber-700',
  "chap-oʻrta": 'bg-emerald-100 text-emerald-700',
  "chap-koʻrsatkich": 'bg-sky-100 text-sky-700',
  "oʻng-koʻrsatkich": 'bg-indigo-100 text-indigo-700',
  "oʻng-oʻrta": 'bg-emerald-100 text-emerald-700',
  "oʻng-nomsiz": 'bg-amber-100 text-amber-700',
  "oʻng-jimjiloq": 'bg-rose-100 text-rose-700',
  'bosh barmoq': 'bg-slate-100 text-slate-600',
};

// Mashq turi -> odam tushunadigan nom
export const MODE_LABEL = {
  KEYS: 'Harflar',
  WORDS: "Soʻzlar",
  TEXT: 'Matn',
  TIMED: 'Vaqtli test',
};

// ---------- Baho (yulduzchalar) ----------

// Mashq natijasining umumiy foizi: aniqlik va maqsadli tezlikka yetish
// darajasidan iborat. Aniqlik ogʻirroq (60%), chunki xatosiz yozish tezlikdan
// muhimroq — tezlik mashq bilan oʻzi keladi.
export function scoreOf(result, target) {
  const accuracy = Math.max(0, Math.min(100, result?.accuracy ?? 0));
  const targetWpm = target?.wpm > 0 ? target.wpm : null;
  if (!targetWpm) return Math.round(accuracy);
  const speed = Math.max(0, Math.min(100, ((result?.wpm ?? 0) / targetWpm) * 100));
  return Math.round(accuracy * 0.6 + speed * 0.4);
}

// Foizdan yulduzchalar soni (yarimta aniqligida).
// 90% dan yuqori natija — toʻliq 5 ta yulduz.
export function starsOf(score) {
  if (score >= 90) return 5;
  return Math.max(0.5, Math.round((score / 20) * 2) / 2);
}

// Yulduzchalar soniga qarab qisqa izoh
export function starLabel(stars) {
  if (stars >= 5) return "Aʼlo!";
  if (stars >= 4) return 'Juda yaxshi';
  if (stars >= 3) return 'Yaxshi';
  if (stars >= 2) return "Oʻrtacha";
  return 'Mashq kerak';
}

// ---------- Dars uslublari (animatsiya) ----------
//
// Har bir darsga roʻyxatdagi uslublardan biri navbat bilan biriktiriladi
// (dars tartib raqami boʻyicha) — shunda ketma-ket darslar bir xil koʻrinmaydi,
// ammo bitta darsning uslubi har safar bir xil boʻladi.
export const TYPING_STYLES = [
  {
    id: 'pulse', cursor: 'tp-cursor-pulse', hit: 'tp-hit-pop', win: 'tp-win-rise', confetti: false,
  },
  {
    id: 'bounce', cursor: 'tp-cursor-bounce', hit: 'tp-hit-drop', win: 'tp-win-zoom', confetti: false,
  },
  {
    id: 'glow', cursor: 'tp-cursor-glow', hit: 'tp-hit-pop', win: 'tp-win-rise', confetti: true,
  },
  {
    id: 'calm', cursor: '', hit: 'tp-hit-drop', win: 'tp-win-zoom', confetti: false,
  },
  {
    id: 'festive', cursor: 'tp-cursor-bounce', hit: 'tp-hit-pop', win: 'tp-win-zoom', confetti: true,
  },
];

export function styleFor(index = 0) {
  const i = Number.isInteger(index) && index >= 0 ? index : 0;
  return TYPING_STYLES[i % TYPING_STYLES.length];
}
