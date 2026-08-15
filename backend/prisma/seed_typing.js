// "Klaviaturada tez yozish" kursini yaratadi yoki yangilaydi.
// Ishga tushirish: npm run db:seed:typing
//
// Idempotent: qayta ishga tushirilsa mavjud kursni yangilaydi. Hech narsani
// O'CHIRMAYDI — admin qo'shgan bo'lim/darslar joyida qoladi va o'quvchilar
// progressi buzilmaydi.
const { PrismaClient } = require('@prisma/client');
const { COURSE, SECTIONS } = require('./typingCourse');

const prisma = new PrismaClient();

// Mashq matnini bazaga yozishdan oldin tozalash (pleerdagi bilan bir xil)
const { normalizeDrill } = require('../src/utils/typing');

async function pickCategory() {
  const preferred = await prisma.category.findUnique({ where: { slug: COURSE.categorySlug } });
  if (preferred) return preferred;

  const any = await prisma.category.findFirst({ orderBy: { name: 'asc' } });
  if (any) return any;

  return prisma.category.create({
    data: {
      name: 'Kompyuter savodxonligi',
      slug: 'kompyuter-savodxonligi',
      icon: '⌨️',
      description: 'Kompyuter va klaviatura bilan ishlash asoslari',
    },
  });
}

async function main() {
  const category = await pickCategory();

  const base = {
    title: COURSE.title,
    description: COURSE.description,
    thumbnail: COURSE.thumbnail,
    authorName: COURSE.authorName,
    price: 0,
    isFree: true,
    level: COURSE.level,
    accessMonths: COURSE.accessMonths,
    kind: 'TYPING',
    published: true,
    categoryId: category.id,
  };

  const course = await prisma.course.upsert({
    where: { slug: COURSE.slug },
    update: base,
    create: { slug: COURSE.slug, ...base },
  });
  console.log(`📘 Kurs: ${course.title} (${course.slug}) — kategoriya: ${category.name}`);

  let lessonCount = 0;
  for (const [si, s] of SECTIONS.entries()) {
    // Bo'limni nomi bo'yicha topamiz (unique cheklov yo'q — shuning uchun findFirst)
    let section = await prisma.section.findFirst({
      where: { courseId: course.id, title: s.title },
    });
    if (section) {
      section = await prisma.section.update({ where: { id: section.id }, data: { order: si } });
    } else {
      section = await prisma.section.create({
        data: { courseId: course.id, title: s.title, order: si },
      });
    }

    for (const [li, l] of s.lessons.entries()) {
      let lesson = await prisma.lesson.findFirst({
        where: { sectionId: section.id, title: l.title },
      });
      if (lesson) {
        lesson = await prisma.lesson.update({
          where: { id: lesson.id },
          data: { order: li },
        });
      } else {
        lesson = await prisma.lesson.create({
          data: { sectionId: section.id, title: l.title, order: li },
        });
      }

      const drill = {
        mode: l.mode || 'TEXT',
        content: normalizeDrill(l.content),
        targetWpm: l.targetWpm ?? s.targetWpm,
        targetAccuracy: l.targetAccuracy ?? s.targetAccuracy,
        durationSec: l.mode === 'TIMED' ? (l.durationSec ?? 60) : null,
        showKeyboard: l.showKeyboard ?? true,
        hint: l.hint || null,
      };
      await prisma.typingDrill.upsert({
        where: { lessonId: lesson.id },
        update: drill,
        create: { lessonId: lesson.id, ...drill },
      });
      lessonCount += 1;
    }
    console.log(`  ✓ ${s.title} — ${s.lessons.length} dars`);
  }

  console.log(`\n✅ Tayyor: ${SECTIONS.length} bo'lim, ${lessonCount} dars`);
  console.log(`   Sahifa: /courses/${COURSE.slug}`);
}

main()
  .catch((err) => {
    console.error('❌ Seed xatosi:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
