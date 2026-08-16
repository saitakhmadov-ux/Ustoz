// Bazani JSON zaxiradan tiklash (faqat terminal orqali).
//
//   npm run db:restore -- <fayl.ndjson.gz> [--yes] [--force]
//
// Admin panelida bu amal ATAYLAB yo'q: bitta tugma butun bazani almashtirib
// yuborishi mumkin. Shuning uchun tiklash faqat serverga kirish huquqi bo'lgan
// odam qo'lida bo'ladi.
//
// Ishlash tartibi:
//   1. Fayl sarlavhasidagi sxema izi hozirgi sxema bilan solishtiriladi.
//   2. Hamma jadval TESKARI tartibda tozalanadi (bog'liqlik buzilmasin).
//   3. Yozuvlar to'g'ri tartibda qaytariladi.
//   Hammasi BITTA tranzaksiyada — o'rtada xato bo'lsa baza umuman o'zgarmaydi.
//
// Bayroqlar:
//   --yes    tasdiq so'ramaydi (avtomatlashtirish uchun)
//   --force  sxema izi mos kelmasa ham davom etadi; nomaʼlum jadval va
//            maydonlar tashlab ketiladi
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const readline = require('readline');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { Prisma } = require('@prisma/client');
const prisma = require('../src/config/prisma');
const { modelOrder, clientKey, schemaFingerprint } = require('../src/utils/backup');

const INSERT_BATCH = 500;
const TX_TIMEOUT_MS = 30 * 60 * 1000; // katta zaxira uchun

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--'));
const hasFlag = (name) => args.includes(`--${name}`);

function fail(message) {
  console.error(`\n❌ ${message}\n`);
  process.exit(1);
}

// Gzip bo'lsa ochamiz, bo'lmasa to'g'ridan-to'g'ri o'qiymiz
function openBackup(filePath) {
  const fd = fs.openSync(filePath, 'r');
  const head = Buffer.alloc(2);
  fs.readSync(fd, head, 0, 2, 0);
  fs.closeSync(fd);
  const stream = fs.createReadStream(filePath);
  const gzipped = head[0] === 0x1f && head[1] === 0x8b;
  return gzipped ? stream.pipe(zlib.createGunzip()) : stream;
}

// Faylning har qatori uchun chaqiradi
async function eachLine(filePath, onLine) {
  const rl = readline.createInterface({ input: openBackup(filePath), crlfDelay: Infinity });
  for await (const line of rl) {
    if (line.trim()) await onLine(line);
  }
}

// Terminalda tasdiq so'raydi
function confirm(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (answer) => {
    rl.close();
    resolve(answer.trim());
  }));
}

async function main() {
  if (!file) fail('Fayl ko\'rsatilmadi.\n   Misol: npm run db:restore -- zaxira.ndjson.gz');
  if (!fs.existsSync(file)) fail(`Fayl topilmadi: ${file}`);

  // ---- 1. Sarlavha ----
  let meta = null;
  await eachLine(file, (line) => {
    if (meta) return;
    const parsed = JSON.parse(line);
    if (parsed.meta) meta = parsed.meta;
  }).catch((e) => fail(`Faylni o'qib bo'lmadi: ${e.message}`));

  if (!meta) fail('Bu fayl Ustoz zaxirasiga o\'xshamaydi (sarlavha topilmadi).');

  const current = schemaFingerprint();
  const same = meta.schema === current;

  console.log('\n📦 Zaxira fayli:', path.resolve(file));
  console.log('   Yaratilgan:', meta.createdAt);
  console.log('   Migratsiya:', meta.migration || '—');
  console.log('   Jadvallar:', meta.models.length);
  console.log('   Yozuvlar:', Object.values(meta.counts).reduce((a, b) => a + b, 0));
  console.log('   Sxema izi:', meta.schema, same ? '(mos ✓)' : `(HOZIRGI: ${current} ✗)`);

  if (!same && !hasFlag('force')) {
    fail(
      'Zaxira boshqa sxemadan olingan. Avval mos migratsiyani qo\'llang '
      + '(`npx prisma migrate deploy`), yoki nomaʼlum jadval/maydonlarni tashlab '
      + 'ketish uchun --force qo\'shing.'
    );
  }

  // ---- 2. Tasdiq ----
  const known = new Set(modelOrder());
  const target = new URL(process.env.DATABASE_URL).pathname.replace('/', '');
  console.log(`\n⚠️  "${target}" bazasidagi BARCHA maʼlumot o'chiriladi va zaxira bilan almashtiriladi.`);
  if (!hasFlag('yes')) {
    const answer = await confirm('   Davom etish uchun TIKLASH deb yozing: ');
    if (answer !== 'TIKLASH') fail('Bekor qilindi.');
  }

  // ---- 3. Tiklash (bitta tranzaksiya) ----
  const order = modelOrder();
  const inserted = {};
  const skipped = new Set();

  console.log('\n⏳ Tiklanmoqda…');
  await prisma.$transaction(async (tx) => {
    // Teskari tartibda tozalash — avval bog'langan jadvallar
    for (const name of [...order].reverse()) {
      await tx[clientKey(name)].deleteMany({});
    }

    // To'g'ri tartibda yozish. Fayl ham shu tartibda yozilgan, shuning uchun
    // qatorlarni oqim bilan o'qib, porsiyalab kiritamiz — butun zaxira
    // xotiraga yig'ilmaydi.
    let currentModel = null;
    let batch = [];

    const flush = async () => {
      if (!currentModel || batch.length === 0) return;
      await tx[clientKey(currentModel)].createMany({ data: batch });
      inserted[currentModel] = (inserted[currentModel] || 0) + batch.length;
      batch = [];
    };

    await eachLine(file, async (line) => {
      const parsed = JSON.parse(line);
      if (parsed.meta) return;
      const { m, d } = parsed;
      if (!known.has(m)) { skipped.add(m); return; }

      if (m !== currentModel) {
        await flush();
        currentModel = m;
      }
      // Json maydonining null qiymati — kalitni umuman bermaymiz (standart null)
      const row = {};
      for (const [key, value] of Object.entries(d)) {
        if (value !== null) row[key] = value;
      }
      batch.push(row);
      if (batch.length >= INSERT_BATCH) await flush();
    });
    await flush();
  }, { timeout: TX_TIMEOUT_MS, maxWait: 30_000 });

  console.log('\n✅ Tiklandi:');
  for (const name of order) {
    if (inserted[name]) console.log(`   ${name}: ${inserted[name]}`);
  }
  if (skipped.size) {
    console.log(`\n⚠️  Tashlab ketilgan (hozirgi sxemada yo'q): ${[...skipped].join(', ')}`);
  }
  await prisma.$disconnect();
}

main().catch(async (err) => {
  await prisma.$disconnect().catch(() => {});
  const detail = err instanceof Prisma.PrismaClientKnownRequestError
    ? `${err.code} — ${err.message}`
    : err.message;
  fail(`Tiklashda xatolik (baza o'zgarmadi): ${detail}`);
});
