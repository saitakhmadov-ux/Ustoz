// Baza zaxirasi (backup).
//
// Ikkita format bor:
//
//   1) JSON (.ndjson.gz) — ASOSIY yo'l. Jadvallar ro'yxati Prisma sxemasidan
//      (`Prisma.dmmf`) o'qiladi, shuning uchun sxemaga YANGI MODEL qo'shilsa
//      shu faylga hech narsa yozmasdan zaxiraga tushadi. Hech qanday tashqi
//      dastur talab qilmaydi — Railway'da ham ishlaydi.
//
//   2) SQL (pg_dump) — QO'SHIMCHA yo'l. Standart PostgreSQL formati, istalgan
//      vosita bilan tiklanadi. Lekin `pg_dump` serverda bo'lmasligi mumkin
//      (Nixpacks Node obrazida yo'q) yoki versiyasi bazadan past bo'lishi
//      mumkin — shuning uchun avval `pgDumpInfo()` bilan tekshiriladi.
//
// Fayl ichida parol hash'lari, emaillar, Telegram chat ID lari va SiteSetting
// dagi maxfiy kalitlar (bot tokeni, SMTP paroli, AI kaliti) bo'ladi — uni
// himoyalangan joyda saqlash kerak.
const crypto = require('crypto');
const zlib = require('zlib');
const { spawn } = require('child_process');
const { Prisma } = require('@prisma/client');
const prisma = require('../config/prisma');

const BACKUP_VERSION = 1;
const READ_BATCH = 500; // bir so'rovda shuncha qator o'qiladi

const models = () => Prisma.dmmf.datamodel.models;

// Model nomidan Prisma mijozidagi xossa nomi: 'AiUsage' -> 'aiUsage'
function clientKey(name) {
  return name.charAt(0).toLowerCase() + name.slice(1);
}

// Modelning birlamchi kaliti (kursor bilan o'qish uchun). Yo'q bo'lsa null.
function idFieldOf(model) {
  const field = model.fields.find((f) => f.isId);
  return field ? field.name : null;
}

// Jadvallarni tashqi kalit (FK) bo'yicha topologik saralaydi: avval bog'lanadigan
// jadval, keyin unga bog'langani. Tiklashda shu tartibda yozish kerak.
// Sikl bo'lsa (A -> B -> A) xato tashlaydi — bunday sxemani bu usul tiklay olmaydi.
function modelOrder() {
  const deps = new Map();
  for (const m of models()) {
    const set = new Set();
    for (const f of m.fields) {
      // relationFromFields bo'sh bo'lmasa — FK ustuni SHU modelda
      if (f.kind === 'object' && f.relationFromFields && f.relationFromFields.length > 0) {
        if (f.type !== m.name) set.add(f.type);
      }
    }
    deps.set(m.name, set);
  }

  const order = [];
  const state = new Map(); // undefined | 'visiting' | 'done'

  function visit(name, stack) {
    if (state.get(name) === 'done') return;
    if (state.get(name) === 'visiting') {
      throw new Error(`Sxemada halqa bor: ${[...stack, name].join(' -> ')}`);
    }
    state.set(name, 'visiting');
    for (const dep of deps.get(name) || []) visit(dep, [...stack, name]);
    state.set(name, 'done');
    order.push(name);
  }

  for (const m of models()) visit(m.name, []);
  return order;
}

// Sxema izi — modellar va ularning oddiy maydonlari nomlaridan. Tiklashda
// "bu fayl boshqa sxemadan olingan" holatini aniqlash uchun.
function schemaFingerprint() {
  const parts = models()
    .map((m) => {
      const fields = m.fields
        .filter((f) => f.kind !== 'object')
        .map((f) => f.name)
        .sort()
        .join(',');
      return `${m.name}(${fields})`;
    })
    .sort();
  return crypto.createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 16);
}

// Oxirgi qo'llangan migratsiya nomi (bo'lmasa null)
async function lastMigration() {
  try {
    const rows = await prisma.$queryRaw`
      SELECT migration_name FROM _prisma_migrations
      WHERE finished_at IS NOT NULL
      ORDER BY finished_at DESC LIMIT 1
    `;
    return rows[0] ? rows[0].migration_name : null;
  } catch {
    return null; // migratsiya jadvali yo'q (masalan db push bilan yaratilgan)
  }
}

// Har model bo'yicha qator soni
async function rowCounts() {
  const counts = {};
  for (const m of models()) {
    counts[m.name] = await prisma[clientKey(m.name)].count();
  }
  return counts;
}

// Zaxira sarlavhasi (faylning birinchi qatori)
async function backupMeta() {
  return {
    version: BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    schema: schemaFingerprint(),
    migration: await lastMigration(),
    models: modelOrder(),
    counts: await rowCounts(),
  };
}

// Oqimga yozish — bufer to'lsa bo'shashini kutadi (xotira o'smasin)
function write(stream, chunk) {
  if (stream.write(chunk)) return Promise.resolve();
  return new Promise((resolve) => stream.once('drain', resolve));
}

// Fayl nomi uchun sana: 2026-08-16-0430
function stamp(date = new Date()) {
  const iso = date.toISOString();
  return `${iso.slice(0, 10)}-${iso.slice(11, 13)}${iso.slice(14, 16)}`;
}

function backupFilename(ext) {
  return `ustoz-zaxira-${stamp()}.${ext}`;
}

// JSON zaxirani javobga oqim bilan yozadi.
// Format: gzip ichida NDJSON — birinchi qator {"meta":{...}}, keyin har yozuv
// alohida qatorda {"m":"Model","d":{...}}.
async function streamJsonBackup(res) {
  const gzip = zlib.createGzip();
  res.setHeader('Content-Type', 'application/gzip');
  res.setHeader('Content-Disposition', `attachment; filename="${backupFilename('ndjson.gz')}"`);
  // Proksi javobni bufferlab qo'ymasin
  res.setHeader('Cache-Control', 'no-store');
  gzip.pipe(res);

  const meta = await backupMeta();
  await write(gzip, `${JSON.stringify({ meta })}\n`);

  const byName = new Map(models().map((m) => [m.name, m]));
  for (const name of meta.models) {
    const model = byName.get(name);
    const idField = idFieldOf(model);
    const client = prisma[clientKey(name)];
    let cursor = null;
    let skip = 0;

    for (;;) {
      // Kursor bilan o'qiymiz — offset kattalashganda sekinlashmaydi.
      // Birlamchi kaliti yo'q model bo'lsa (hozir yo'q) offset'ga qaytamiz.
      const page = idField
        ? await client.findMany({
          take: READ_BATCH,
          orderBy: { [idField]: 'asc' },
          ...(cursor ? { skip: 1, cursor: { [idField]: cursor } } : {}),
        })
        : await client.findMany({ take: READ_BATCH, skip });

      if (page.length === 0) break;

      // Bir necha qatorni birga yozamiz — har qator uchun alohida write qilmaymiz
      await write(gzip, `${page.map((row) => JSON.stringify({ m: name, d: row })).join('\n')}\n`);

      if (page.length < READ_BATCH) break;
      if (idField) cursor = page[page.length - 1][idField];
      else skip += page.length;
    }
  }

  await new Promise((resolve, reject) => {
    gzip.end(resolve);
    gzip.on('error', reject);
  });
  return meta;
}

// ---- pg_dump ----

const pgDumpBin = () => process.env.PG_DUMP_PATH || 'pg_dump';

// pg_dump bor-yo'qligi va versiyasi. Qaytaradi: { available, version, error }
function pgDumpInfo() {
  return new Promise((resolve) => {
    let out = '';
    let err = '';
    let child;
    try {
      child = spawn(pgDumpBin(), ['--version']);
    } catch (e) {
      resolve({ available: false, version: null, error: e.message });
      return;
    }
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { err += d; });
    child.on('error', (e) => resolve({ available: false, version: null, error: e.message }));
    child.on('close', (code) => {
      if (code === 0) resolve({ available: true, version: out.trim(), error: null });
      else resolve({ available: false, version: null, error: err.trim() || `chiqish kodi ${code}` });
    });
  });
}

// pg_dump chiqishini javobga ulaydi (custom format — pg_restore uchun).
// Xato bo'lsa: hali hech narsa yozilmagan bo'lsa xato tashlaydi, yozilgan
// bo'lsa ulanish uziladi (brauzer faylni "buzilgan" deb ko'rsatadi).
function streamPgDump(res) {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL topilmadi');

  return new Promise((resolve, reject) => {
    const child = spawn(pgDumpBin(), [
      '--format=custom',
      '--no-owner',
      '--no-privileges',
      '--dbname', url,
    ]);

    let started = false;
    let err = '';

    child.stderr.on('data', (d) => { err += d; });
    child.on('error', (e) => reject(new Error(`pg_dump ishga tushmadi: ${e.message}`)));

    child.stdout.once('data', () => {
      started = true;
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${backupFilename('dump')}"`);
      res.setHeader('Cache-Control', 'no-store');
    });
    child.stdout.pipe(res);

    child.on('close', (code) => {
      if (code === 0) return resolve();
      const message = err.trim() || `pg_dump ${code} kodi bilan tugadi`;
      if (started) {
        // Sarlavhalar ketib bo'lgan — yarim faylni to'liqdek ko'rsatmaslik uchun uzamiz
        res.destroy();
        return resolve();
      }
      return reject(new Error(message));
    });
  });
}

module.exports = {
  BACKUP_VERSION,
  modelOrder,
  clientKey,
  idFieldOf,
  schemaFingerprint,
  backupMeta,
  rowCounts,
  streamJsonBackup,
  pgDumpInfo,
  streamPgDump,
  backupFilename,
};
