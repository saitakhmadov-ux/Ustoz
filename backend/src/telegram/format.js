// Telegram xabarlarini formatlash yordamchilari.
//
// Bot xabarlari HTML rejimida yuboriladi (parse_mode: 'HTML'), shuning uchun
// foydalanuvchi/AI matni har doim `esc` dan o'tkaziladi. AI javobi markdown
// ko'rinishida keladi — uni Telegram tushunadigan HTML'ga aylantiramiz va
// 4096 belgi chegarasiga sig'adigan bo'laklarga bo'lamiz.

const env = require('../config/env');

// Botdagi havolalar uchun saytning manzili.
//
// Tartib: PUBLIC_SITE_URL (aniq ko'rsatilgan bo'lsa) -> CLIENT_URL dagi birinchi
// HTTPS manzil -> birinchi manzil. HTTPS ustuvor, chunki Telegram'ning `web_app`
// tugmasi faqat HTTPS bilan ishlaydi va CLIENT_URL ro'yxatida localhost birinchi
// turib qolishi mumkin.
const siteUrl = () => {
  const explicit = (process.env.PUBLIC_SITE_URL || '').trim();
  if (explicit) return explicit.replace(/\/+$/, '');

  const list = String(env.clientUrl)
    .split(',')
    .map((s) => s.trim().replace(/\/+$/, ''))
    .filter(Boolean);
  return list.find((u) => u.startsWith('https://')) || list[0] || '';
};

// `web_app` (Mini App) tugmasi faqat HTTPS manzil bilan ishlaydi.
const siteIsHttps = () => siteUrl().startsWith('https://');

// Oddiy `url` tugmasi va matndagi havolalar uchun manzil "haqiqiy" bo'lishi kerak.
// Telegram `localhost` ni havola deb tanimaydi (TLD yo'q) — shunday manzil
// xabarda oddiy matn bo'lib qoladi va tugmaga ham qo'yib bo'lmaydi.
// Domen yoki IP bo'lsa (http bo'lsa ham) havola ishlaydi.
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1']);
const siteIsLinkable = () => {
  try {
    return !LOCAL_HOSTS.has(new URL(siteUrl()).hostname);
  } catch {
    return false;
  }
};

// Telegram bitta xabar chegarasi 4096; sarlavha/qo'shimchalar uchun zaxira qoldiramiz.
const CHUNK_LIMIT = 3500;
// Bitta juda uzun qator (minifikatsiya qilingan kod, uzun matn) shuncha belgidan
// keyin majburan bo'linadi. Belgilar HTML'ga aylanganda kengayadi (& -> &amp;),
// shuning uchun chegara CHUNK_LIMIT dan ancha kichik.
const MAX_RAW_LINE = 400;

// HTML rejimida yuborilgani uchun matnni himoyalaymiz
const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

// "████░░░░░░ 45%" ko'rinishidagi progress chizig'i
function bar(percent) {
  const p = Math.max(0, Math.min(100, Math.round(percent || 0)));
  const filled = Math.round((p / 100) * 10);
  return `${'█'.repeat(filled)}${'░'.repeat(10 - filled)} ${p}%`;
}

// 1250000 -> "1 250 000"
const money = (n) => new Intl.NumberFormat('uz-UZ').format(Math.round(n || 0));

// O'sish foizi: "▲ 12%" / "▼ 8%" / "—"
function growth(pct) {
  if (!pct) return '—';
  return pct > 0 ? `▲ ${pct}%` : `▼ ${Math.abs(pct)}%`;
}

// "12.08.2026" ko'rinishidagi sana
function shortDate(d) {
  if (!d) return '—';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '—';
  const pad = (x) => String(x).padStart(2, '0');
  return `${pad(dt.getDate())}.${pad(dt.getMonth() + 1)}.${dt.getFullYear()}`;
}

// Uzun qatorni bo'laklarga bo'ladi (imkon bo'lsa bo'sh joydan).
function splitLongLine(line, max) {
  if (line.length <= max) return [line];
  const parts = [];
  let rest = line;
  while (rest.length > max) {
    const window = rest.slice(0, max);
    const space = window.lastIndexOf(' ');
    const cut = space > max * 0.6 ? space : max;
    parts.push(rest.slice(0, cut));
    rest = rest.slice(cut).replace(/^ /, '');
  }
  if (rest) parts.push(rest);
  return parts;
}

// Matn qatoridagi markdown belgilarini Telegram HTML'ga aylantiradi.
// Kirish — XOM matn (hali escape qilinmagan).
function inlineHtml(raw) {
  // Ichki kodni (`...`) avval ajratib olamiz — ичidagi ** va _ o'zgartirilmasin
  const codes = [];
  let text = raw.replace(/`([^`\n]+)`/g, (_, code) => {
    codes.push(code);
    return `\u0001${codes.length - 1}\u0001`;
  });

  text = esc(text);

  // [matn](havola) — faqat http/https
  text = text.replace(
    /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g,
    (_, label, url) => `<a href="${url.replace(/"/g, '%22')}">${label}</a>`,
  );

  text = text
    .replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>')
    .replace(/(^|[\s(])_([^_\n]+)_(?=[\s.,!?)]|$)/g, '$1<i>$2</i>');

  // Sarlavha (### Matn) — qalin matnga aylantiramiz
  text = text.replace(/^\s{0,3}#{1,6}\s*(.+)$/, '<b>$1</b>');
  // Ro'yxat belgisi
  text = text.replace(/^(\s*)[-*]\s+/, '$1• ');

  // Ichki kodni qaytaramiz
  return text.replace(/\u0001(\d+)\u0001/g, (_, i) => `<code>${esc(codes[Number(i)])}</code>`);
}

// Tayyor HTML qatorlarini Telegram chegarasiga sig'adigan xabarlarga bo'ladi.
// Ro'yxat uzayganda (kurslar, yozilishlar) xabar 4096 dan oshib ketmasin —
// aks holda Telegram butun xabarni rad etadi va foydalanuvchi hech narsa ko'rmaydi.
// Bo'linish faqat qatorlar orasidan bo'ladi, ya'ni HTML teglari buzilmaydi.
function chunkLines(lines, limit = CHUNK_LIMIT) {
  const out = [];
  let cur = '';
  for (const line of lines) {
    if (cur && cur.length + line.length + 1 > limit) {
      out.push(cur);
      cur = '';
    }
    cur += (cur ? '\n' : '') + line;
  }
  if (cur.trim()) out.push(cur);
  return out;
}

// AI javobini (markdown) Telegram HTML bo'laklariga aylantiradi.
// Qaytaradi: xabar matnlari massivi — har biri alohida yuboriladi.
function mdToTelegramChunks(markdown, limit = CHUNK_LIMIT) {
  const src = String(markdown || '').trim();
  if (!src) return [];

  const chunks = [];
  let cur = '';
  const flush = () => {
    if (cur.trim()) chunks.push(cur.trim());
    cur = '';
  };
  const addBlock = (html) => {
    if (cur && cur.length + html.length + 1 > limit) flush();
    cur += (cur ? '\n' : '') + html;
  };

  // ```lang ... ``` bloklari bo'yicha ajratamiz
  const fence = /```([a-zA-Z0-9+#-]*)\r?\n?([\s\S]*?)```/g;
  let last = 0;
  let m = fence.exec(src);

  const addText = (chunkText) => {
    for (const rawLine of chunkText.split('\n')) {
      for (const piece of splitLongLine(rawLine, MAX_RAW_LINE * 2)) {
        addBlock(inlineHtml(piece));
      }
    }
  };

  const addCode = (code, lang) => {
    const open = lang ? `<pre><code class="language-${lang.toLowerCase()}">` : '<pre>';
    const close = lang ? '</code></pre>' : '</pre>';
    const overhead = open.length + close.length;
    let buf = '';
    const flushCode = () => {
      if (buf.length) addBlock(open + buf + close);
      buf = '';
    };
    for (const rawLine of code.replace(/\s+$/, '').split('\n')) {
      for (const piece of splitLongLine(rawLine, MAX_RAW_LINE)) {
        const line = esc(piece);
        if (buf && buf.length + line.length + 1 + overhead > limit) flushCode();
        buf += (buf ? '\n' : '') + line;
      }
    }
    flushCode();
  };

  while (m) {
    if (m.index > last) addText(src.slice(last, m.index).replace(/^\n+|\n+$/g, ''));
    addCode(m[2], m[1]);
    last = m.index + m[0].length;
    m = fence.exec(src);
  }
  // Qolgan quyruq. Yopilmagan ``` bo'lsa (javob uzilib qolgan bo'lishi mumkin) —
  // ochilgan joydan keyingi hamma narsani kod sifatida ko'rsatamiz.
  if (last < src.length) {
    const tail = src.slice(last).replace(/^\n+/, '');
    const open = tail.match(/```([a-zA-Z0-9+#-]*)\r?\n?/);
    if (open) {
      if (open.index > 0) addText(tail.slice(0, open.index));
      addCode(tail.slice(open.index + open[0].length), open[1]);
    } else {
      addText(tail);
    }
  }

  flush();
  return chunks;
}

module.exports = {
  CHUNK_LIMIT,
  siteUrl,
  siteIsHttps,
  siteIsLinkable,
  esc,
  bar,
  money,
  growth,
  shortDate,
  chunkLines,
  mdToTelegramChunks,
};
