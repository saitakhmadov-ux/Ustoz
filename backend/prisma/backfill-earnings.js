// Mavjud (eski) to'langan xaridlar uchun daromad yozuvlarini yaratadi.
//
// Maosh tizimi joriy qilinganda bazada allaqachon PAID to'lovlar bo'ladi —
// ularsiz ustoz va admin hisobotlari bo'sh ko'rinadi. Bu skript o'shalarni
// bir marta to'ldiradi.
//
// Eski to'lovlar uchun tarixiy foizlar saqlanmagan, shuning uchun HOZIRGI
// sozlama foizlari qo'llanadi va yozuvga snapshot qilinadi.
//
// Ishga tushirish:  node prisma/backfill-earnings.js
// Xavfsiz: idempotent — qayta ishga tushirilsa dublikat yaratmaydi.

require('dotenv').config();
const prisma = require('../src/config/prisma');
const { recordEarningForPayment } = require('../src/utils/recordEarning');

async function main() {
  console.log('🔄 Eski to\'lovlar bo\'yicha daromad yozuvlari tekshirilmoqda...');

  const payments = await prisma.payment.findMany({
    where: {
      status: 'PAID',
      earning: null, // hali daromad yozuvi bo'lmaganlari
      course: { instructorId: { not: null } }, // ustozi biriktirilgan kurslar
    },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      courseId: true,
      amount: true,
      promoCodeId: true,
      createdAt: true,
      course: { select: { id: true, title: true, instructorId: true } },
    },
  });

  if (payments.length === 0) {
    console.log('✅ Yangi yozuv kerak emas — hammasi joyida.');
    return;
  }

  console.log(`📋 ${payments.length} ta to'lov topildi.`);

  let created = 0;
  let totalInstructor = 0;
  for (const p of payments) {
    const earning = await recordEarningForPayment(p, p.course);
    if (!earning) continue;
    created += 1;
    totalInstructor += earning.instructorAmount;

    // Daromad sanasi to'lov sanasiga moslanadi (aks holda hammasi bugungi
    // kunga tushib, oylik grafik noto'g'ri chiqadi).
    if (earning.createdAt.getTime() !== p.createdAt.getTime()) {
      await prisma.earning.update({
        where: { id: earning.id },
        data: { createdAt: p.createdAt },
      });
    }
  }

  console.log(`✅ ${created} ta daromad yozuvi yaratildi.`);
  console.log(`💰 Ustozlarga tegishli jami: ${totalInstructor.toLocaleString('uz-UZ')} so'm`);
}

main()
  .catch((e) => {
    console.error('❌ Xatolik:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
