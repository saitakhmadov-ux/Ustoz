// Bir martalik backfill: mavjud yozilishlarga foydalanish muddati qo'yadi va
// eski tugatilgan darslarni (LessonProgress) yangi vazifa tizimiga (TaskProgress) ko'chiradi.
// Ishga tushirish: node prisma/backfill_access_tasks.js
const prisma = require('../src/config/prisma');
const { computeExpiry, lessonTasks } = require('../src/utils/learnProgress');

async function main() {
  // 1) Muddatsiz yozilishlarga muddat beramiz (demo mosligi uchun bugundan boshlab)
  const enrollments = await prisma.enrollment.findMany({
    where: { expiresAt: null },
    include: { course: { select: { level: true } } },
  });
  let setExpiry = 0;
  for (const e of enrollments) {
    await prisma.enrollment.update({
      where: { id: e.id },
      data: { expiresAt: computeExpiry(e.course.level) },
    });
    setExpiry += 1;
  }
  console.log(`✔ ${setExpiry} ta yozilishga foydalanish muddati qo'yildi`);

  // 2) Tugatilgan darslarni vazifa progressiga ko'chiramiz
  const completed = await prisma.lessonProgress.findMany({
    where: { completed: true },
    select: {
      userId: true,
      lesson: {
        select: {
          id: true,
          videoUrl: true,
          content: true,
          materials: { select: { id: true, type: true } },
          questions: { select: { id: true } },
        },
      },
    },
  });

  let created = 0;
  for (const row of completed) {
    const keys = lessonTasks(row.lesson).map((t) => t.key);
    for (const key of keys) {
      const res = await prisma.taskProgress.upsert({
        where: { userId_taskKey: { userId: row.userId, taskKey: key } },
        update: {},
        create: { userId: row.userId, taskKey: key, lessonId: row.lesson.id },
      });
      if (res) created += 1;
    }
  }
  console.log(`✔ ${completed.length} ta tugatilgan dars uchun vazifa yozuvlari sinxronlandi (${created} kalit)`);
}

main()
  .then(() => { console.log('Backfill tugadi.'); return prisma.$disconnect(); })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
