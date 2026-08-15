// IELTS topshiriqlar bankini bazaga yuklaydi.
// Ishga tushirish: npm run db:seed:ielts
//
// Idempotent va EHTIYOTKOR: `code` bo'yicha faqat YETISHMAYOTGAN topshiriqlarni
// qo'shadi. Mavjud yozuvga tegmaydi — admin panelidagi tahrirlar (savol matni,
// yuklangan rasm, faol/nofaol holati) saqlanib qoladi.
const { PrismaClient } = require('@prisma/client');
const { TASKS } = require('./ieltsTasks');

const prisma = new PrismaClient();

async function main() {
  const mavjud = await prisma.ieltsTask.findMany({ select: { code: true } });
  const bor = new Set(mavjud.map((t) => t.code));

  const yangi = TASKS.filter((t) => !bor.has(t.code));
  if (yangi.length === 0) {
    console.log(`✅ Barcha ${TASKS.length} ta topshiriq allaqachon bazada — o'zgarish yo'q`);
    return;
  }

  await prisma.ieltsTask.createMany({
    data: yangi.map((t) => ({
      code: t.code,
      type: t.type,
      subtype: t.subtype || null,
      level: t.level || null,
      title: t.title,
      prompt: t.prompt,
      visual: t.visual || 'NONE',
      chartData: t.chartData || undefined,
      imageUrl: t.imageUrl || null,
      dataSummary: t.dataSummary || null,
      body: t.body || null,
      minWords: t.minWords ?? null,
      durationSec: t.durationSec ?? null,
      order: t.order ?? 0,
    })),
    skipDuplicates: true,
  });

  const soni = await prisma.ieltsTask.groupBy({ by: ['type'], _count: { _all: true } });
  console.log(`✅ ${yangi.length} ta yangi topshiriq qo'shildi\n`);
  soni.forEach((s) => console.log(`   ${s.type.padEnd(12)} — ${s._count._all} ta`));

  // Rasm kutayotgan topshiriqlarni eslatib qo'yamiz
  const rasmsiz = await prisma.ieltsTask.findMany({
    where: { visual: { in: ['PROCESS', 'MAP'] }, imageUrl: null },
    select: { code: true, title: true },
  });
  if (rasmsiz.length > 0) {
    console.log('\n⚠️  Rasm yuklanishi kerak (Admin → IELTS topshiriqlari):');
    rasmsiz.forEach((t) => console.log(`   ${t.code} — ${t.title}`));
  }
}

main()
  .catch((err) => {
    console.error('❌ Seed xatosi:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
