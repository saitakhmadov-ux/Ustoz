// Boshlang'ich ma'lumotlar: admin + kategoriyalar + namunaviy kurslar
// Ishga tushirish: npm run db:seed
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

const categories = [
  { name: 'Office dasturlari', slug: 'office', icon: '📊', description: 'Word, Excel, PowerPoint va boshqalar' },
  { name: 'Frontend', slug: 'frontend', icon: '🎨', description: 'HTML, CSS, JavaScript, React va boshqalar' },
  { name: 'Backend', slug: 'backend', icon: '⚙️', description: 'Node.js, Python, ma\'lumotlar bazalari' },
  { name: 'Mobile', slug: 'mobile', icon: '📱', description: 'Flutter, React Native, Android, iOS' },
  { name: 'DevOps', slug: 'devops', icon: '🚀', description: 'Docker, CI/CD, bulutli texnologiyalar' },
  { name: 'Data Science', slug: 'data-science', icon: '📈', description: 'Ma\'lumotlar tahlili, ML, sun\'iy intellekt' },
];

// Namunaviy kurslar (slug -> to'liq tuzilma)
const sampleCourses = [
  {
    slug: 'html-css-asoslari',
    title: 'HTML va CSS asoslari',
    categorySlug: 'frontend',
    authorName: 'Jasur Rahimov',
    description: 'Veb-sahifa yaratishni noldan o\'rganing. Ushbu kursda HTML teglari, CSS uslublari va responsive dizayn asoslari bilan tanishasiz.',
    thumbnail: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800',
    isFree: true,
    price: 0,
    level: 'BEGINNER',
    published: true,
    sections: [
      {
        title: 'Kirish',
        lessons: [
          { title: 'Kurs haqida', videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', content: 'Ushbu kursda nimalarni o\'rganamiz.', isFreePreview: true },
          { title: 'Veb qanday ishlaydi', content: 'Brauzer, server va HTTP haqida asosiy tushunchalar.' },
        ],
      },
      {
        title: 'HTML asoslari',
        lessons: [
          { title: 'HTML teglari', videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', content: 'Sarlavhalar, paragraflar, ro\'yxatlar va havolalar.' },
          {
            title: 'Formalar', content: 'input, textarea, button va form elementlari.',
            quiz: [
              { question: 'Qaysi teg matn kiritish maydonini yaratadi?', options: ['<input>', '<div>', '<span>', '<p>'], correctIndex: 0 },
              { question: 'Havola yaratuvchi teg qaysi?', options: ['<link>', '<a>', '<href>', '<url>'], correctIndex: 1 },
            ],
          },
        ],
      },
      {
        title: 'CSS asoslari',
        lessons: [
          { title: 'Selektorlar va uslublar', content: 'Class, id va element selektorlari.' },
          { title: 'Flexbox', videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', content: 'Zamonaviy joylashuv (layout) usuli.' },
        ],
      },
    ],
  },
  {
    slug: 'javascript-boshlangich',
    title: 'JavaScript — boshlang\'ich kurs',
    categorySlug: 'frontend',
    authorName: 'Dilnoza Karimova',
    description: 'JavaScript dasturlash tilini asoslardan o\'rganing: o\'zgaruvchilar, funksiyalar, DOM bilan ishlash va amaliy loyihalar.',
    thumbnail: 'https://images.unsplash.com/photo-1579468118864-1b9ea3c0db4a?w=800',
    isFree: false,
    price: 149000,
    level: 'BEGINNER',
    published: true,
    sections: [
      {
        title: 'Asoslar',
        lessons: [
          { title: 'O\'zgaruvchilar (let, const)', content: 'Ma\'lumotlarni saqlash.', isFreePreview: true },
          { title: 'Ma\'lumot turlari', content: 'String, number, boolean, array, object.' },
          {
            title: 'Shartlar (if/else)', content: 'Mantiqiy amallar.',
            quiz: [
              { question: 'O\'zgarmas qiymat qaysi kalit so\'z bilan e\'lon qilinadi?', options: ['var', 'let', 'const', 'static'], correctIndex: 2 },
            ],
          },
        ],
      },
      {
        title: 'Funksiyalar va DOM',
        lessons: [
          { title: 'Funksiyalar', videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', content: 'Kod bloklarini qayta ishlatish.' },
          { title: 'DOM bilan ishlash', content: 'Sahifa elementlarini boshqarish.' },
        ],
      },
    ],
  },
  {
    slug: 'nodejs-express-api',
    title: 'Node.js va Express bilan API yaratish',
    categorySlug: 'backend',
    authorName: 'Sardor Alimov',
    description: 'Server tomonini o\'rganing: Node.js, Express framework, REST API, ma\'lumotlar bazasi va autentifikatsiya.',
    thumbnail: 'https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=800',
    isFree: false,
    price: 249000,
    level: 'INTERMEDIATE',
    published: true,
    sections: [
      {
        title: 'Node.js asoslari',
        lessons: [
          { title: 'Node.js nima?', content: 'Server tomonida JavaScript.', isFreePreview: true },
          { title: 'NPM va modullar', content: 'Paketlarni boshqarish.' },
        ],
      },
      {
        title: 'Express framework',
        lessons: [
          { title: 'Birinchi server', videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', content: 'Express bilan HTTP server.' },
          { title: 'Routing va middleware', content: 'So\'rovlarni boshqarish.' },
          { title: 'REST API', content: 'CRUD amallari.' },
        ],
      },
    ],
  },
  {
    slug: 'excel-boshqaruv',
    title: 'Excel — noldan professionalgacha',
    categorySlug: 'office',
    authorName: 'Nodira Yusupova',
    description: 'Microsoft Excel dasturini to\'liq o\'zlashtiring: formulalar, jadvallar, diagrammalar va ma\'lumotlar tahlili.',
    thumbnail: 'https://images.unsplash.com/photo-1543286386-713bdd548da4?w=800',
    isFree: true,
    price: 0,
    level: 'BEGINNER',
    published: true,
    sections: [
      {
        title: 'Boshlang\'ich',
        lessons: [
          { title: 'Interfeys bilan tanishuv', content: 'Kataklar, satrlar, ustunlar.', isFreePreview: true },
          { title: 'Asosiy formulalar', content: 'SUM, AVERAGE, COUNT.' },
        ],
      },
    ],
  },
  {
    slug: 'flutter-mobil-ilova',
    title: 'Flutter bilan mobil ilova yaratish',
    categorySlug: 'mobile',
    authorName: 'Bekzod Toshmatov',
    description: 'Bitta koddan iOS va Android uchun ilova yarating. Flutter va Dart tilini amaliy loyihalar orqali o\'rganing.',
    thumbnail: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800',
    isFree: false,
    price: 299000,
    level: 'INTERMEDIATE',
    published: true,
    sections: [
      {
        title: 'Dart asoslari',
        lessons: [
          { title: 'Dart tili', content: 'Sintaksis va asosiy tushunchalar.', isFreePreview: true },
          { title: 'Widgetlar', content: 'Flutter UI qurilish bloklari.' },
        ],
      },
    ],
  },
  {
    slug: 'docker-boshlangich',
    title: 'Docker asoslari',
    categorySlug: 'devops',
    authorName: 'Sardor Alimov',
    description: 'Konteynerlashtirish texnologiyasini o\'rganing. Docker image, container, volume va Docker Compose bilan ishlash.',
    thumbnail: 'https://images.unsplash.com/photo-1605745341112-85968b19335b?w=800',
    isFree: false,
    price: 199000,
    level: 'ADVANCED',
    published: true,
    sections: [
      {
        title: 'Kirish',
        lessons: [
          { title: 'Docker nima?', content: 'Konteyner va virtual mashina farqi.', isFreePreview: true },
          { title: 'Birinchi konteyner', videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', content: 'docker run buyrug\'i.' },
        ],
      },
    ],
  },
];

async function main() {
  console.log('🌱 Seed boshlandi...');

  // Admin
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@ustoz.uz';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin12345';
  const adminName = process.env.ADMIN_NAME || 'Bosh Admin';
  const passwordHash = await bcrypt.hash(adminPassword, 10);
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: 'ADMIN' },
    create: { fullName: adminName, email: adminEmail, passwordHash, role: 'ADMIN' },
  });
  console.log(`👤 Admin tayyor: ${admin.email}`);

  // Kategoriyalar
  const catMap = {};
  for (const cat of categories) {
    const c = await prisma.category.upsert({ where: { slug: cat.slug }, update: {}, create: cat });
    catMap[cat.slug] = c.id;
  }
  console.log(`📂 ${categories.length} ta kategoriya tayyor`);

  // Namunaviy foydalanuvchi
  const demoHash = await bcrypt.hash('demo12345', 10);
  await prisma.user.upsert({
    where: { email: 'demo@ustoz.uz' },
    update: {},
    create: { fullName: 'Demo Foydalanuvchi', email: 'demo@ustoz.uz', passwordHash: demoHash, role: 'USER' },
  });
  console.log('👤 Demo foydalanuvchi: demo@ustoz.uz / demo12345');

  // Kurslar
  let created = 0;
  for (const course of sampleCourses) {
    const exists = await prisma.course.findUnique({ where: { slug: course.slug } });
    if (exists) continue;

    await prisma.course.create({
      data: {
        title: course.title,
        slug: course.slug,
        description: course.description,
        thumbnail: course.thumbnail,
        authorName: course.authorName,
        price: course.price,
        isFree: course.isFree,
        level: course.level,
        published: course.published,
        categoryId: catMap[course.categorySlug],
        sections: {
          create: course.sections.map((s, si) => ({
            title: s.title,
            order: si,
            lessons: {
              create: s.lessons.map((l, li) => ({
                title: l.title,
                order: li,
                videoUrl: l.videoUrl || null,
                content: l.content || null,
                isFreePreview: l.isFreePreview || false,
                questions: l.quiz
                  ? { create: l.quiz.map((q) => ({ question: q.question, options: q.options, correctIndex: q.correctIndex })) }
                  : undefined,
              })),
            },
          })),
        },
      },
    });
    created += 1;
  }
  console.log(`📚 ${created} ta namunaviy kurs qo\'shildi (${sampleCourses.length - created} tasi allaqachon mavjud edi)`);

  console.log('✅ Seed yakunlandi');
}

main()
  .catch((e) => { console.error('❌ Seed xatoligi:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
