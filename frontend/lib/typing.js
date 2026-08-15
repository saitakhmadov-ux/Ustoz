// Klaviatura mashqi uchun umumiy yordamchilar (brauzer tomoni).
//
// MUHIM: solishtirish va hisoblash qoidalari backend/src/utils/typing.js bilan
// AYNAN bir xil bo'lishi kerak — aks holda ekranda ko'ringan natija server
// bergan natijadan farq qiladi. Biri o'zgarsa, ikkinchisi ham o'zgartiriladi.

// O'zbek lotinidagi apostrof variantlari (oʻ, gʻ, tutuq belgisi) — hammasi
// bitta belgiga keltiriladi, shuning uchun odam oddiy ' bossa ham to'g'ri.
const APOSTROPHES = /[ʻʼ‘’‛`´']/g;
export const APOSTROPHE = 'ʻ';

export function normalizeText(s) {
  return String(s == null ? '' : s)
    .replace(APOSTROPHES, APOSTROPHE)
    .replace(/[   \t]/g, ' ')
    .replace(/\r\n?/g, '\n');
}

export const normalizeChar = (ch) => normalizeText(ch);

// Standart o'lchov: "so'z" = 5 belgi
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
// hisob YAKUNIY matn bo'yicha — xatoni tuzatsangiz aniqlik tiklanadi).
export function compare(expected, typed) {
  const exp = normalizeText(expected);
  const got = normalizeText(typed);
  let correct = 0;
  for (let i = 0; i < got.length; i += 1) {
    if (i < exp.length && got[i] === exp[i]) correct += 1;
  }
  return { correct, wrong: got.length - correct, chars: got.length };
}

// ---------- Matnni qatorlarga bo'lish ----------
// Uzun matnni (ayniqsa vaqtli mashqda) to'liq chizmaymiz: so'zlar bo'yicha
// qatorlarga bo'lib, faqat joriy qator atrofini ko'rsatamiz.
// MUHIM: qatorlar matnni QOLDIRMASDAN qoplaydi — qator oxiridagi probel ham
// o'sha qatorga kiradi. Aks holda kursor qator chegarasida ko'rinmay qolardi
// (odam probel bosishi kerakligini bilmaydi).
export function splitLines(text, perLine = 52) {
  const s = String(text || '');
  const lines = [];
  let start = 0;

  while (start < s.length) {
    let end = Math.min(s.length, start + perLine);
    if (end < s.length) {
      // So'z o'rtasidan uzmaymiz: oxirgi probelgacha qaytamiz va probelni
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

// Fizik tugmalar (AQSh/QWERTY — o'zbek lotin yozuvi shu joylashuvda yoziladi)
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
  // Apostrofning barcha ko'rinishlari — bitta ' tugmasi
  if (APOSTROPHES.test(ch)) {
    APOSTROPHES.lastIndex = 0;
    return { key: "'", shift: false };
  }
  const lower = ch.toLowerCase();
  if (lower !== ch) return { key: lower, shift: true }; // katta harf
  if (SHIFTED[ch]) return { key: SHIFTED[ch], shift: true };
  return { key: ch, shift: false };
}

// Barmoqlar taqsimoti (rang va ko'rsatma uchun)
const FINGER_KEYS = {
  'chap-jimjiloq': ['`', '1', 'q', 'a', 'z'],
  'chap-nomsiz': ['2', 'w', 's', 'x'],
  "chap-o'rta": ['3', 'e', 'd', 'c'],
  "chap-ko'rsatkich": ['4', '5', 'r', 't', 'f', 'g', 'v', 'b'],
  "o'ng-ko'rsatkich": ['6', '7', 'y', 'u', 'h', 'j', 'n', 'm'],
  "o'ng-o'rta": ['8', 'i', 'k', ','],
  "o'ng-nomsiz": ['9', 'o', 'l', '.'],
  "o'ng-jimjiloq": ['0', '-', '=', 'p', '[', ']', ';', "'", '/'],
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
  "chap-o'rta": 'bg-emerald-100 text-emerald-700',
  "chap-ko'rsatkich": 'bg-sky-100 text-sky-700',
  "o'ng-ko'rsatkich": 'bg-indigo-100 text-indigo-700',
  "o'ng-o'rta": 'bg-emerald-100 text-emerald-700',
  "o'ng-nomsiz": 'bg-amber-100 text-amber-700',
  "o'ng-jimjiloq": 'bg-rose-100 text-rose-700',
  'bosh barmoq': 'bg-slate-100 text-slate-600',
};

// Mashq turi -> odam tushunadigan nom
export const MODE_LABEL = {
  KEYS: 'Harflar',
  WORDS: "So'zlar",
  TEXT: 'Matn',
  TIMED: 'Vaqtli test',
};
