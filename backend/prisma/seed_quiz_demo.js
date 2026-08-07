// Demo test bazasi — yangi test tizimini sinab ko'rish uchun.
// Birinchi nashr etilgan kursga "Sinov testlari (demo)" bo'limini qo'shadi:
//   - "Bo'lim testi (demo)"  — quizDraw 10, bazada 20 ta savol
//   - "Yakuniy test (demo)"  — quizDraw 40, bazada 80 ta savol
// Savollar oddiy arifmetik (to'g'ri javobi aniq) — mexanizmni sinash uchun.
// Ishga tushirish:  node prisma/seed_quiz_demo.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const SECTION_TITLE = 'Sinov testlari (demo)';

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// i-raqamli demo savol (arifmetik, to'g'ri javobi aniq)
function makeQuestion(i) {
  const a = 2 + (i % 20);
  const b = 3 + ((i * 7) % 25);
  const sum = a + b;
  const opts = shuffle([sum, sum + 1, sum - 2, sum + 3]).map(String);
  const correctIndex = opts.indexOf(String(sum));
  return { question: `Demo savol ${i}: ${a} + ${b} = ?`, options: opts, correctIndex };
}

async function makeTestLesson(sectionId, title, order, quizDraw, count) {
  const lesson = await prisma.lesson.create({
    data: { sectionId, title, order, quizDraw, quizPassPercent: 60, quizTimePerQ: 20, quizCooldownHours: 3 },
  });
  const data = [];
  for (let i = 1; i <= count; i += 1) {
    const q = makeQuestion(i + order * 100);
    data.push({ lessonId: lesson.id, question: q.question, options: q.options, correctIndex: q.correctIndex });
  }
  await prisma.quizQuestion.createMany({ data });
  return lesson;
}

async function main() {
  const course = await prisma.course.findFirst({
    where: { published: true },
    orderBy: { createdAt: 'asc' },
    include: { sections: true },
  });
  if (!course) {
    console.log('❌ Nashr etilgan kurs topilmadi. Avval `npm run db:seed` ni ishga tushiring.');
    return;
  }

  // Eski demo bo'limini tozalaymiz (qayta ishlatish uchun)
  const existing = course.sections.find((s) => s.title === SECTION_TITLE);
  if (existing) {
    await prisma.section.delete({ where: { id: existing.id } });
    console.log('♻️  Eski demo bo\'limi o\'chirildi.');
  }

  const order = course.sections.length;
  const section = await prisma.section.create({
    data: { courseId: course.id, title: SECTION_TITLE, order },
  });

  await makeTestLesson(section.id, 'Bo\'lim testi (demo)', 0, 10, 20);
  await makeTestLesson(section.id, 'Yakuniy test (demo)', 1, 40, 80);

  console.log(`✅ Demo testlar qo'shildi -> kurs: "${course.title}" (/${course.slug})`);
  console.log('   • Bo\'lim testi (demo): 20 ta savol, 10 tasi tasodifiy beriladi');
  console.log('   • Yakuniy test (demo): 80 ta savol, 40 tasi tasodifiy beriladi');
  console.log('   Admin (admin@ustoz.uz) bilan kirib, kurs "Learn" sahifasida sinab ko\'ring.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
