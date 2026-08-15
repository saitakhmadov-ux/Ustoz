// Erkin mashq uchun o'zbekcha so'zlar (lotin yozuvi).
//
// Tanlash mezoni: kundalik nutqda ko'p uchraydigan, qisqa va o'rta uzunlikdagi
// so'zlar. "oʻ" va "gʻ" li so'zlar ataylab qo'shilgan — klaviaturada apostrof
// bilan yozish mashq qilinsin (yozishda ' ham, ʻ ham qabul qilinadi).
const WORDS = [
  'men', 'sen', 'biz', 'siz', 'ular', 'bu', 'shu', 'har', 'ham', 'yana',
  'kun', 'tun', 'oy', 'yil', 'vaqt', 'soat', 'daqiqa', 'hafta', 'bugun', 'ertaga',
  'uy', 'maktab', 'sinf', 'kitob', 'daftar', 'qalam', 'dars', 'ustoz', 'talaba', 'bilim',
  'ish', 'kasb', 'mehnat', 'natija', 'maqsad', 'reja', 'fikr', 'savol', 'javob', 'misol',
  'yaxshi', 'yomon', 'katta', 'kichik', 'yangi', 'eski', 'tez', 'sekin', 'oson', 'qiyin',
  'bir', 'ikki', 'uch', 'toʻrt', 'besh', 'olti', 'yetti', 'sakkiz', 'toʻqqiz', 'oʻn',
  'ona', 'ota', 'aka', 'uka', 'opa', 'singil', 'bola', 'oila', 'doʻst', 'inson',
  'shahar', 'qishloq', 'koʻcha', 'yoʻl', 'bogʻ', 'daryo', 'togʻ', 'dala', 'osmon', 'quyosh',
  'suv', 'non', 'choy', 'olma', 'uzum', 'anor', 'sabzi', 'piyoz', 'guruch', 'meva',
  'oq', 'qora', 'qizil', 'yashil', 'sariq', 'koʻk', 'rang', 'shakl', 'oʻlcham', 'ogʻirlik',
  'bilan', 'uchun', 'keyin', 'oldin', 'ichida', 'ustida', 'ostida', 'yonida', 'orqali', 'haqida',
  'boʻldi', 'keldi', 'ketdi', 'oldi', 'berdi', 'qildi', 'yozdi', 'oʻqidi', 'koʻrdi', 'eshitdi',
  'boshladi', 'tugatdi', 'oʻrgandi', 'tushundi', 'ishladi', 'yashadi', 'gapirdi', 'soʻradi',
  'kompyuter', 'klaviatura', 'dastur', 'internet', 'saytda', 'fayl', 'papka', 'tugma', 'ekran', 'xotira',
  'til', 'soʻz', 'harf', 'jumla', 'matn', 'sahifa', 'nuqta', 'vergul', 'boʻsh', 'toʻliq',
];

// Tasodifiy so'zlardan matn tuzadi (ketma-ket bir xil so'z tushmasligi uchun
// oxirgisi takrorlanmaydi — mashq zerikarli bo'lib qolmasin).
function randomWords(count) {
  const n = Math.max(1, Math.min(300, Number(count) || 25));
  const out = [];
  let last = null;
  for (let i = 0; i < n; i += 1) {
    let w = WORDS[Math.floor(Math.random() * WORDS.length)];
    if (w === last) w = WORDS[(WORDS.indexOf(w) + 1) % WORDS.length];
    out.push(w);
    last = w;
  }
  return out.join(' ');
}

// Vaqtli mashq uchun matn: sekundiga taxminan 200 wpm tezlikka yetadigan
// hajm (juda tez odam ham matnni tugatib qo'ymasin).
function wordsForDuration(sec) {
  const s = Math.max(5, Math.min(300, Number(sec) || 30));
  return randomWords(Math.ceil((200 * s) / 60) + 20);
}

module.exports = { WORDS, randomWords, wordsForDuration };
