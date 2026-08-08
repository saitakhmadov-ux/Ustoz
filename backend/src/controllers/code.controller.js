// Kod maydoni (playground) uchun ko'p tilli kod-ishga-tushirish.
// JS/TS brauzerda lokal bajariladi; qolgan tillar (Python, C++, C#, Java) shu yerdan
// Wandbox API (ochiq, bepul, kalitsiz) orqali ishga tushiriladi.
// Eslatma: ochiq Piston API 2026-02-15'dan whitelist-only bo'ldi — shuning uchun Wandbox.
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

const WANDBOX_BASE = process.env.WANDBOX_URL || 'https://wandbox.org/api';
const MAX_CODE = 50000; // belgi
const MIN_GAP_MS = 1500; // bir foydalanuvchi so'rovlari orasidagi eng kam interval

// Bizning til identifikatorlarimiz -> Wandbox kompilyator tanlash qoidasi.
// wLang — Wandbox "language" nomi; prefix — afzal kompilyator boshlanishi; local — brauzerda.
const LANG_MAP = {
  javascript: { label: 'JavaScript', local: true },
  python: { label: 'Python', wLang: 'Python', prefix: 'cpython-3.' },
  cpp: { label: 'C++', wLang: 'C++', prefix: 'gcc-' },
  csharp: { label: 'C#', wLang: 'C#', prefix: 'mono-' }, // dotnetcore Wandbox'da nosoz
  java: { label: 'Java', wLang: 'Java', prefix: 'openjdk-' },
};

// Wandbox kompilyatorlar ro'yxati keshi
let listCache = null;
let listAt = 0;
const LIST_TTL = 60 * 60 * 1000; // 1 soat

// So'nggi ishga tushirish vaqti (foydalanuvchi bo'yicha) — oddiy throttle
const lastRun = new Map();

async function fetchJson(url, options = {}, timeoutMs = 25000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: ctrl.signal });
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
    return { ok: res.ok, status: res.status, data };
  } finally {
    clearTimeout(t);
  }
}

async function getCompilerList() {
  if (listCache && Date.now() - listAt < LIST_TTL) return listCache;
  const { ok, data } = await fetchJson(`${WANDBOX_BASE}/list.json`, {}, 20000);
  if (!ok || !Array.isArray(data)) throw new ApiError(502, 'Kod-ishga-tushirish xizmati javob bermadi.');
  listCache = data;
  listAt = Date.now();
  return data;
}

// Nomdagi barcha sonlarni massiv sifatida qaytaradi (versiya solishtirish uchun)
function versionNums(name) {
  return (name.match(/\d+/g) || []).map((n) => parseInt(n, 10));
}
function cmpNums(a, b) {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] || 0) - (b[i] || 0);
    if (d !== 0) return d;
  }
  return 0;
}

// Til uchun eng yangi mos kompilyatorni tanlaydi
async function resolveCompiler(langKey) {
  const map = LANG_MAP[langKey];
  if (!map || map.local) return null;
  const list = await getCompilerList();
  const candidates = list.filter(
    (c) => c.language === map.wLang && c.name.startsWith(map.prefix) && !c.name.includes('head')
  );
  if (!candidates.length) return null;
  candidates.sort((a, b) => cmpNums(versionNums(b.name), versionNums(a.name)));
  return candidates[0].name;
}

// Java: Wandbox faylni prog.java deb nomlaydi -> "public class" xato beradi.
// Top-level public'ni olib tashlaymiz (Wandbox'da baribir public class ishlamaydi).
function normalizeCode(langKey, code) {
  if (langKey === 'java') return code.replace(/\bpublic\s+class\b/g, 'class');
  return code;
}

// GET /api/code/languages — qo'llab-quvvatlanadigan tillar (frontend dropdown uchun)
const listLanguages = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    languages: Object.entries(LANG_MAP).map(([id, m]) => ({ id, label: m.label, local: !!m.local })),
  });
});

// POST /api/code/run — kodni Wandbox orqali bajaradi
// Body: { language, code, stdin? }
const runCode = asyncHandler(async (req, res) => {
  const { language, code, stdin } = req.body || {};
  const map = LANG_MAP[language];
  if (!map) throw ApiError.badRequest('Til qo\'llab-quvvatlanmaydi');
  if (map.local) throw ApiError.badRequest('Bu til brauzerda bajariladi (serverga yuborilmaydi)');
  if (typeof code !== 'string' || !code.trim()) throw ApiError.badRequest('Kod bo\'sh bo\'lmasligi kerak');
  if (code.length > MAX_CODE) throw ApiError.badRequest('Kod juda uzun (50 000 belgidan oshmasin)');

  // Throttle
  const prev = lastRun.get(req.user.id) || 0;
  const now = Date.now();
  if (now - prev < MIN_GAP_MS) {
    const e = ApiError.badRequest('Biroz sekinroq — bir necha soniyadan so\'ng qayta urinib ko\'ring.');
    e.code = 'RATE_LIMITED';
    throw e;
  }
  lastRun.set(req.user.id, now);

  const compiler = await resolveCompiler(language);
  if (!compiler) throw new ApiError(502, `${map.label} uchun kompilyator topilmadi.`);

  const { ok, data } = await fetchJson(`${WANDBOX_BASE}/compile.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: normalizeCode(language, code),
      compiler,
      stdin: typeof stdin === 'string' ? stdin.slice(0, 5000) : '',
    }),
  }, 30000);

  if (!ok || !data) throw new ApiError(502, 'Kodni ishga tushirishda xatolik (xizmat javob bermadi).');

  res.json({
    success: true,
    language,
    compiler,
    compileOutput: data.compiler_error || '',
    stdout: data.program_output || '',
    stderr: data.program_error || '',
    exitCode: data.status !== undefined ? parseInt(data.status, 10) : null,
  });
});

module.exports = { listLanguages, runCode };
