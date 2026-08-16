// Ustoz maoshi (daromadi) hisobotlari.
//
// Ustoz (INSTRUCTOR) faqat o'z daromadini ko'radi, bosh admin (ADMIN) esa
// barcha ustozlar bo'yicha umumiy manzarani va har bir ustoz kesimini ko'radi.
//
// Barcha summalar Earning yozuvlaridan olinadi — foizlar o'sha yozuvda snapshot
// qilingani uchun sozlama keyin o'zgarsa ham tarixiy hisobot o'zgarmaydi.
//
// Hisob-kitob BAZADA bajariladi (aggregate / groupBy / sana kesimidagi xom SQL).
// Yozuvlarni Node xotirasiga to'liq tortib olmaymiz: sotuvlar soni yillar
// davomida o'sadi va butun jadvalni o'qish sekinlik hamda xotira muammosiga
// olib keladi. Xuddi shu yondashuv Telegram botidagi `/maosh` da ham.
const { z } = require('zod');
const { Prisma } = require('@prisma/client');
const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const {
  periodRange, growthPct, fillMonths, seriesFor,
} = require('../utils/period');
const { dateBuckets, toMap } = require('../utils/reportSql');
const { getPayoutConfig, setSetting, PAYOUT_KEY } = require('../utils/settings');
const { normalizePayoutConfig } = require('../utils/earnings');
const { startCsv, csvDate } = require('../utils/csv');

// ---------- Umumiy yordamchilar ----------

// Daromad yozuvlari uchun kim bo'yicha filtr. Ustoz — faqat o'zi.
function earningScope(user, instructorId) {
  if (user.role === 'INSTRUCTOR') return { instructorId: user.id };
  return instructorId ? { instructorId } : {};
}

// Sahifalash parametrlari
function pageParams(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(query.limit, 10) || 20));
  return { page, limit, skip: (page - 1) * limit };
}

// Sana oralig'i filtri (?from=2026-01-01&to=2026-06-30). Yaroqsiz sana e'tiborsiz.
function dateFilter(query) {
  const range = {};
  const from = query.from ? new Date(query.from) : null;
  const to = query.to ? new Date(query.to) : null;
  if (from && !Number.isNaN(from.getTime())) range.gte = from;
  if (to && !Number.isNaN(to.getTime())) {
    // "to" kunining oxirigacha kiritamiz
    to.setHours(23, 59, 59, 999);
    range.lte = to;
  }
  return Object.keys(range).length ? range : null;
}

// Bo'sh yig'indi
function emptySums() {
  return {
    sales: 0, gross: 0, tax: 0, net: 0, instructor: 0, platform: 0,
  };
}

// Yig'indilar uchun aggregate maydonlari
const SUM_FIELDS = {
  grossAmount: true,
  taxAmount: true,
  netAmount: true,
  instructorAmount: true,
  platformAmount: true,
};

// Prisma aggregate/groupBy natijasini hisobot yig'indisiga aylantiradi
function toSums(agg) {
  const s = agg._sum || {};
  return {
    sales: (agg._count && (agg._count._all ?? agg._count)) || 0,
    gross: s.grossAmount || 0,
    tax: s.taxAmount || 0,
    net: s.netAmount || 0,
    instructor: s.instructorAmount || 0,
    platform: s.platformAmount || 0,
  };
}

// Berilgan filtr bo'yicha yig'indi — butun hisob bazada bajariladi
async function sumEarnings(where) {
  const agg = await prisma.earning.aggregate({
    where,
    _count: { _all: true },
    _sum: SUM_FIELDS,
  });
  return toSums(agg);
}

// Yig'indini qatorga qo'shish (kurs/ustoz kesimini yig'ish uchun)
function addSums(row, sums, source) {
  row.sales += sums.sales;
  row.gross += sums.gross;
  row.tax += sums.tax;
  row.net += sums.net;
  row.instructor += sums.instructor;
  row.platform += sums.platform;
  if (source === 'REFERRAL') row.referralInstructor += sums.instructor;
  else row.organicInstructor += sums.instructor;
}

// Xom SQL (sana kesimidagi guruhlash) uchun daromad filtri.
// Prisma `where` obyekti SQL shartiga aylantiriladi — qiymatlar parametr
// sifatida uzatiladi, satrga yopishtirilmaydi.
function earningWhereSql(scope) {
  return scope.instructorId
    ? Prisma.sql`"instructorId" = ${scope.instructorId}`
    : Prisma.sql`TRUE`;
}

// Daromadning oy va (kerak bo'lsa) kun kesimidagi qatorlari.
// metrics — { nom: 'SQL ifoda' }; kunlik so'rov faqat qisqa davrlarda kerak.
async function earningSeries(scope, days, metrics) {
  const where = earningWhereSql(scope);
  const table = 'Earning';
  const [months, daysRows] = await Promise.all([
    dateBuckets({ table, metrics, where, unit: 'month' }),
    days !== null && days <= 90
      ? dateBuckets({ table, metrics, where, unit: 'day' })
      : Promise.resolve([]),
  ]);
  return { months, days: daysRows };
}

// Oy boshini qaytaradi
function monthStart(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

// Ustozning to'langan (PAID) o'tkazmalari yig'indisi
async function paidPayoutsSum(where) {
  const agg = await prisma.payout.aggregate({
    where: { ...where, status: 'PAID' },
    _sum: { amount: true },
  });
  return agg._sum.amount || 0;
}

// ---------- Ustoz: maosh dashboardi ----------
// GET /api/admin/teaching/earnings?period=7d|30d|90d|1y|all
const myEarnings = asyncHandler(async (req, res) => {
  const scope = earningScope(req.user, null);
  const { period, days, from, prevFrom } = periodRange(req.query.period);

  const mStart = monthStart();
  const prevMonthStart = new Date(mStart.getFullYear(), mStart.getMonth() - 1, 1);
  const payoutWhere = req.user.role === 'INSTRUCTOR' ? { instructorId: req.user.id } : {};

  const [
    totals, periodSums, prevSums, organic, referral, thisMonth, lastMonth,
    grouped, courses, config, paid, buckets,
  ] = await Promise.all([
    sumEarnings(scope),
    from ? sumEarnings({ ...scope, createdAt: { gte: from } }) : null,
    from ? sumEarnings({ ...scope, createdAt: { gte: prevFrom, lt: from } }) : null,
    sumEarnings({ ...scope, source: 'ORGANIC' }),
    sumEarnings({ ...scope, source: 'REFERRAL' }),
    sumEarnings({ ...scope, createdAt: { gte: mStart } }),
    sumEarnings({ ...scope, createdAt: { gte: prevMonthStart, lt: mStart } }),
    // Kurs × manba kesimi — bazada guruhlanadi
    prisma.earning.groupBy({
      by: ['courseId', 'source'],
      where: scope,
      _count: { _all: true },
      _sum: SUM_FIELDS,
      orderBy: { _sum: { instructorAmount: 'desc' } },
    }),
    prisma.course.findMany({
      where: req.user.role === 'INSTRUCTOR' ? { instructorId: req.user.id } : {},
      select: { id: true, title: true, slug: true, price: true, isFree: true },
    }),
    getPayoutConfig(),
    paidPayoutsSum(payoutWhere),
    earningSeries(scope, days, {
      sales: 'COUNT(*)',
      instructor: 'SUM("instructorAmount")',
      gross: 'SUM("grossAmount")',
    }),
  ]);

  // Davr 'all' bo'lsa cheklov yo'q — joriy davr jami bilan, oldingisi bo'sh
  const periodTotals = periodSums || totals;
  const prevTotals = prevSums || emptySums();

  // 12 oylik qator (ustoz ulushi va sotuvlar)
  const monthlyInstructor = fillMonths(toMap(buckets.months, 'instructor'), 12);
  const monthlySales = toMap(buckets.months, 'sales');
  const monthlyGross = toMap(buckets.months, 'gross');
  const monthly = monthlyInstructor.map((m) => ({
    month: m.key,
    instructor: m.value,
    sales: monthlySales[m.key] || 0,
    gross: monthlyGross[m.key] || 0,
  }));

  // Grafik uchun tanlangan davrga mos qator: 7/30/90 kun — kunlik,
  // 1 yil — oylik (12 oy), butun davr — birinchi sotuvdan bugungacha
  const series = seriesFor(days, {
    dayMap: toMap(buckets.days, 'instructor'),
    monthMap: toMap(buckets.months, 'instructor'),
  });

  // Kurs kesimi — daromad keltirmagan pulli kurslar ham ko'rinadi (0 bilan)
  const byCourseMap = new Map();
  for (const c of courses) {
    if (c.isFree || c.price === 0) continue;
    byCourseMap.set(c.id, {
      courseId: c.id, title: c.title, slug: c.slug, ...emptySums(),
      organicInstructor: 0, referralInstructor: 0,
    });
  }
  // Guruhlashda chiqqan, lekin ro'yxatda yo'q kurslar uchun nom kerak
  const missingIds = grouped
    .map((g) => g.courseId)
    .filter((id) => !byCourseMap.has(id));
  const missing = missingIds.length
    ? await prisma.course.findMany({
      where: { id: { in: [...new Set(missingIds)] } },
      select: { id: true, title: true, slug: true },
    })
    : [];
  const missingById = new Map(missing.map((c) => [c.id, c]));

  for (const g of grouped) {
    if (!byCourseMap.has(g.courseId)) {
      const c = missingById.get(g.courseId);
      byCourseMap.set(g.courseId, {
        courseId: g.courseId,
        title: c ? c.title : '—',
        slug: c ? c.slug : '',
        ...emptySums(),
        organicInstructor: 0,
        referralInstructor: 0,
      });
    }
    addSums(byCourseMap.get(g.courseId), toSums(g), g.source);
  }
  const byCourse = [...byCourseMap.values()].sort((a, b) => b.instructor - a.instructor);

  res.json({
    success: true,
    config,
    totals: {
      ...totals,
      avgCheck: totals.sales ? Math.round(totals.gross / totals.sales) : 0,
    },
    period: {
      key: period,
      days,
      ...periodTotals,
      growth: {
        instructor: growthPct(periodTotals.instructor, prevTotals.instructor),
        sales: growthPct(periodTotals.sales, prevTotals.sales),
        gross: growthPct(periodTotals.gross, prevTotals.gross),
      },
    },
    thisMonth: {
      ...thisMonth,
      growth: growthPct(thisMonth.instructor, lastMonth.instructor),
    },
    lastMonth,
    bySource: { organic, referral },
    monthly,
    series,
    byCourse,
    balance: { earned: totals.instructor, paid, pending: totals.instructor - paid },
  });
});

// ---------- Ustoz: tranzaksiyalar ro'yxati ----------
// GET /api/admin/teaching/earnings/transactions?page&limit&courseId&source&from&to
const myTransactions = asyncHandler(async (req, res) => {
  const { page, limit, skip } = pageParams(req.query);
  const where = { ...earningScope(req.user, null) };

  if (req.query.courseId) where.courseId = req.query.courseId;
  if (['ORGANIC', 'REFERRAL'].includes(req.query.source)) where.source = req.query.source;
  const range = dateFilter(req.query);
  if (range) where.createdAt = range;

  const [rows, total, agg] = await Promise.all([
    prisma.earning.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true, createdAt: true, source: true, sharePct: true, taxPct: true,
        grossAmount: true, taxAmount: true, netAmount: true,
        instructorAmount: true, platformAmount: true,
        course: { select: { id: true, title: true, slug: true } },
        promoCode: { select: { code: true, discountPct: true } },
        payment: {
          select: {
            id: true, originalAmount: true, discountPct: true, provider: true,
            user: { select: { id: true, fullName: true, email: true } },
          },
        },
      },
    }),
    prisma.earning.count({ where }),
    prisma.earning.aggregate({
      where,
      _sum: { grossAmount: true, taxAmount: true, instructorAmount: true, platformAmount: true },
    }),
  ]);

  res.json({
    success: true,
    transactions: rows,
    filteredTotals: {
      sales: total,
      gross: agg._sum.grossAmount || 0,
      tax: agg._sum.taxAmount || 0,
      instructor: agg._sum.instructorAmount || 0,
      platform: agg._sum.platformAmount || 0,
    },
    pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
  });
});

// Tranzaksiyalarni CSV ga aylantirish uchun ustunlar
const TX_COLUMNS = [
  { key: 'createdAt', label: 'Sana', format: csvDate },
  { key: 'course', label: 'Kurs', format: (c) => (c ? c.title : '') },
  { key: 'student', label: "O'quvchi" },
  { key: 'email', label: 'Email' },
  { key: 'originalAmount', label: 'Asl narx' },
  { key: 'discountPct', label: 'Chegirma %' },
  { key: 'grossAmount', label: "To'langan" },
  { key: 'taxPct', label: 'Soliq %' },
  { key: 'taxAmount', label: 'Soliq summasi' },
  { key: 'netAmount', label: 'Sof foyda' },
  { key: 'sourceLabel', label: 'Manba' },
  { key: 'promo', label: 'Promo kod' },
  { key: 'sharePct', label: 'Ulush %' },
  { key: 'instructorAmount', label: 'Ustoz ulushi' },
  { key: 'platformAmount', label: 'Tizim ulushi' },
];

// Earning yozuvini CSV qatoriga tekislaydi
function flattenTx(e) {
  return {
    createdAt: e.createdAt,
    course: e.course,
    student: e.payment && e.payment.user ? e.payment.user.fullName : '',
    email: e.payment && e.payment.user ? e.payment.user.email : '',
    originalAmount: e.payment && e.payment.originalAmount ? e.payment.originalAmount : e.grossAmount,
    discountPct: e.payment ? e.payment.discountPct : 0,
    grossAmount: e.grossAmount,
    taxPct: e.taxPct,
    taxAmount: e.taxAmount,
    netAmount: e.netAmount,
    sourceLabel: e.source === 'REFERRAL' ? 'Promo kod' : 'Organik',
    promo: e.promoCode ? e.promoCode.code : '',
    sharePct: e.sharePct,
    instructorAmount: e.instructorAmount,
    platformAmount: e.platformAmount,
  };
}

// CSV uchun yozuvlar bir porsiyada shuncha o'qiladi
const CSV_BATCH = 500;

// Daromad yozuvlarini porsiya-porsiya o'qib beradi (kursor bo'yicha).
// Butun jadval xotiraga yig'ilmaydi — eksport hajmi qancha o'sishidan qat'i
// nazar server xotirasi barqaror qoladi.
async function eachEarningBatch(where, select, onBatch) {
  let cursor = null;
  for (;;) {
    const rows = await prisma.earning.findMany({
      where,
      // Ikkinchi mezon (id) — bir xil sanali yozuvlarda tartib aniq bo'lishi va
      // kursor sakrab ketmasligi uchun
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: CSV_BATCH,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      select: { id: true, ...select },
    });
    if (rows.length === 0) return;
    onBatch(rows);
    if (rows.length < CSV_BATCH) return;
    cursor = rows[rows.length - 1].id;
  }
}

// CSV uchun o'qiladigan maydonlar
const TX_SELECT = {
  createdAt: true, source: true, sharePct: true, taxPct: true,
  grossAmount: true, taxAmount: true, netAmount: true,
  instructorAmount: true, platformAmount: true,
  course: { select: { title: true } },
  promoCode: { select: { code: true } },
  payment: {
    select: {
      originalAmount: true, discountPct: true,
      user: { select: { fullName: true, email: true } },
    },
  },
};

// So'rov parametrlaridan umumiy CSV filtri (manba va sana oralig'i)
function csvWhere(query, base) {
  const where = { ...base };
  if (['ORGANIC', 'REFERRAL'].includes(query.source)) where.source = query.source;
  const range = dateFilter(query);
  if (range) where.createdAt = range;
  return where;
}

// GET /api/admin/teaching/earnings/export — CSV yuklab olish
const myTransactionsCsv = asyncHandler(async (req, res) => {
  const where = csvWhere(req.query, earningScope(req.user, null));
  if (req.query.courseId) where.courseId = req.query.courseId;

  const stamp = new Date().toISOString().slice(0, 10);
  const csv = startCsv(res, `maosh-hisoboti-${stamp}.csv`, TX_COLUMNS);
  await eachEarningBatch(where, TX_SELECT, (rows) => csv.write(rows.map(flattenTx)));
  csv.end();
});

// ---------- Ustoz: hisobiga o'tkazilgan summalar ----------
// GET /api/admin/teaching/payouts
const myPayouts = asyncHandler(async (req, res) => {
  const where = req.user.role === 'INSTRUCTOR' ? { instructorId: req.user.id } : {};

  const [payouts, earned, paid] = await Promise.all([
    prisma.payout.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, amount: true, status: true, method: true, note: true,
        periodFrom: true, periodTo: true, paidAt: true, createdAt: true,
        instructor: { select: { id: true, fullName: true } },
        createdBy: { select: { fullName: true } },
      },
    }),
    prisma.earning.aggregate({
      where: earningScope(req.user, null),
      _sum: { instructorAmount: true },
    }),
    paidPayoutsSum(where),
  ]);

  const total = earned._sum.instructorAmount || 0;
  res.json({
    success: true,
    payouts,
    balance: { earned: total, paid, pending: total - paid },
  });
});

// ---------- Bosh admin: umumiy maosh hisoboti ----------
// GET /api/admin/earnings?period=...
const adminOverview = asyncHandler(async (req, res) => {
  const { period, days, from, prevFrom } = periodRange(req.query.period);

  const mStart = monthStart();
  const prevMonthStart = new Date(mStart.getFullYear(), mStart.getMonth() - 1, 1);

  const [
    totals, periodSums, prevSums, organic, referral, thisMonth, lastMonth,
    grouped, instructors, payoutsByInstructor, paidAgg, config, unassigned, buckets,
  ] = await Promise.all([
    sumEarnings({}),
    from ? sumEarnings({ createdAt: { gte: from } }) : null,
    from ? sumEarnings({ createdAt: { gte: prevFrom, lt: from } }) : null,
    sumEarnings({ source: 'ORGANIC' }),
    sumEarnings({ source: 'REFERRAL' }),
    sumEarnings({ createdAt: { gte: mStart } }),
    sumEarnings({ createdAt: { gte: prevMonthStart, lt: mStart } }),
    // Ustoz × manba kesimi — bazada guruhlanadi
    prisma.earning.groupBy({
      by: ['instructorId', 'source'],
      _count: { _all: true },
      _sum: SUM_FIELDS,
      orderBy: { _sum: { instructorAmount: 'desc' } },
    }),
    prisma.user.findMany({
      where: { role: 'INSTRUCTOR' },
      select: {
        id: true, fullName: true, email: true,
        _count: { select: { taughtCourses: true } },
      },
    }),
    prisma.payout.groupBy({
      by: ['instructorId'],
      where: { status: 'PAID' },
      _sum: { amount: true },
    }),
    prisma.payout.aggregate({ where: { status: 'PAID' }, _sum: { amount: true } }),
    getPayoutConfig(),
    // Ustozi biriktirilmagan kurslardan tushgan to'lovlar — daromad yozuvi
    // yaratilmaydi, butun mablag' tizimga qoladi. Alohida ko'rsatamiz.
    prisma.payment.aggregate({
      where: { status: 'PAID', course: { instructorId: null } },
      _sum: { amount: true },
      _count: true,
    }),
    earningSeries({}, days, {
      instructor: 'SUM("instructorAmount")',
      platform: 'SUM("platformAmount")',
      tax: 'SUM("taxAmount")',
      gross: 'SUM("grossAmount")',
    }),
  ]);

  const periodTotals = periodSums || totals;
  const prevTotals = prevSums || emptySums();

  const monthlyInstructor = fillMonths(toMap(buckets.months, 'instructor'), 12);
  const monthlyPlatform = toMap(buckets.months, 'platform');
  const monthlyTax = toMap(buckets.months, 'tax');
  const monthlyGross = toMap(buckets.months, 'gross');
  const monthly = monthlyInstructor.map((m) => ({
    month: m.key,
    instructor: m.value,
    platform: monthlyPlatform[m.key] || 0,
    tax: monthlyTax[m.key] || 0,
    gross: monthlyGross[m.key] || 0,
  }));

  // Grafik uchun tanlangan davrga mos qator (7/30/90 kun — kunlik,
  // 1 yil — 12 oy, butun davr — birinchi sotuvdan bugungacha)
  const series = seriesFor(days, {
    dayMap: toMap(buckets.days, 'gross'),
    monthMap: toMap(buckets.months, 'gross'),
  });

  // Ustoz kesimi: ishlangan / to'langan / qoldiq
  const paidByInstructor = {};
  for (const p of payoutsByInstructor) {
    paidByInstructor[p.instructorId] = p._sum.amount || 0;
  }
  const byInstructorMap = new Map();
  for (const i of instructors) {
    byInstructorMap.set(i.id, {
      instructorId: i.id,
      fullName: i.fullName,
      email: i.email,
      courses: i._count.taughtCourses,
      ...emptySums(),
      organicInstructor: 0,
      referralInstructor: 0,
      paid: paidByInstructor[i.id] || 0,
      pending: 0,
    });
  }
  for (const g of grouped) {
    if (!byInstructorMap.has(g.instructorId)) {
      // Ustoz o'chirilgan bo'lsa ham daromad tarixi qoladi
      byInstructorMap.set(g.instructorId, {
        instructorId: g.instructorId,
        fullName: "O'chirilgan ustoz",
        email: '',
        courses: 0,
        ...emptySums(),
        organicInstructor: 0,
        referralInstructor: 0,
        paid: paidByInstructor[g.instructorId] || 0,
        pending: 0,
      });
    }
    addSums(byInstructorMap.get(g.instructorId), toSums(g), g.source);
  }
  const byInstructor = [...byInstructorMap.values()]
    .map((r) => ({ ...r, pending: r.instructor - r.paid }))
    .sort((a, b) => b.instructor - a.instructor);

  const totalPaid = paidAgg._sum.amount || 0;

  res.json({
    success: true,
    config,
    totals: {
      ...totals,
      avgCheck: totals.sales ? Math.round(totals.gross / totals.sales) : 0,
    },
    period: {
      key: period,
      days,
      ...periodTotals,
      growth: {
        gross: growthPct(periodTotals.gross, prevTotals.gross),
        platform: growthPct(periodTotals.platform, prevTotals.platform),
        instructor: growthPct(periodTotals.instructor, prevTotals.instructor),
        sales: growthPct(periodTotals.sales, prevTotals.sales),
      },
    },
    thisMonth: { ...thisMonth, growth: growthPct(thisMonth.gross, lastMonth.gross) },
    lastMonth,
    bySource: { organic, referral },
    monthly,
    series,
    byInstructor,
    payoutTotals: {
      paid: totalPaid,
      pending: totals.instructor - totalPaid,
      earned: totals.instructor,
    },
    // Ustozsiz kurslar: butun sotuv tizimga qoladi
    unassigned: { sales: unassigned._count || 0, gross: unassigned._sum.amount || 0 },
  });
});

// GET /api/admin/earnings/export — barcha tranzaksiyalar CSV
const adminTransactionsCsv = asyncHandler(async (req, res) => {
  const where = csvWhere(req.query, {});
  if (req.query.instructorId) where.instructorId = req.query.instructorId;

  const columns = [
    { key: 'createdAt', label: 'Sana', format: csvDate },
    { key: 'instructorName', label: 'Ustoz' },
    ...TX_COLUMNS.slice(1),
  ];
  const select = { ...TX_SELECT, instructor: { select: { fullName: true } } };

  const stamp = new Date().toISOString().slice(0, 10);
  const csv = startCsv(res, `maosh-umumiy-${stamp}.csv`, columns);
  await eachEarningBatch(where, select, (rows) => csv.write(rows.map((e) => ({
    ...flattenTx(e),
    instructorName: e.instructor ? e.instructor.fullName : '',
  }))));
  csv.end();
});

// GET /api/admin/earnings/instructors/:id — bitta ustoz tafsiloti (bosh admin)
const adminInstructorDetail = asyncHandler(async (req, res) => {
  const instructor = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: {
      id: true, fullName: true, email: true, createdAt: true, role: true,
      taughtCourses: { select: { id: true, title: true, slug: true, price: true, isFree: true } },
    },
  });
  if (!instructor) throw ApiError.notFound('Ustoz topilmadi');

  const scope = { instructorId: instructor.id };
  const [totals, organic, referral, buckets, paidAgg, earnings, payouts, promoCodes] =
    await Promise.all([
      sumEarnings(scope),
      sumEarnings({ ...scope, source: 'ORGANIC' }),
      sumEarnings({ ...scope, source: 'REFERRAL' }),
      earningSeries(scope, 365, { instructor: 'SUM("instructorAmount")' }),
      prisma.payout.aggregate({
        where: { ...scope, status: 'PAID' },
        _sum: { amount: true },
      }),
      // Ro'yxatda faqat oxirgi 100 ta tranzaksiya ko'rsatiladi
      prisma.earning.findMany({
        where: scope,
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: {
          id: true, createdAt: true, source: true, sharePct: true, taxPct: true,
          grossAmount: true, taxAmount: true, netAmount: true,
          instructorAmount: true, platformAmount: true, courseId: true,
          course: { select: { title: true } },
          promoCode: { select: { code: true } },
          payment: {
            select: {
              originalAmount: true, discountPct: true,
              user: { select: { id: true, fullName: true, email: true } },
            },
          },
        },
      }),
      prisma.payout.findMany({
        where: scope,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, amount: true, status: true, method: true, note: true,
          periodFrom: true, periodTo: true, paidAt: true, createdAt: true,
          createdBy: { select: { fullName: true } },
        },
      }),
      prisma.promoCode.findMany({
        where: { instructorId: instructor.id },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, code: true, discountPct: true, active: true, createdAt: true,
          expiresAt: true, maxUses: true,
          course: { select: { id: true, title: true } },
          _count: { select: { earnings: true } },
        },
      }),
    ]);

  const paid = paidAgg._sum.amount || 0;
  const monthlyInstructor = fillMonths(toMap(buckets.months, 'instructor'), 12);

  res.json({
    success: true,
    instructor,
    totals,
    bySource: { organic, referral },
    monthly: monthlyInstructor.map((m) => ({ month: m.key, instructor: m.value })),
    earnings,
    payouts,
    promoCodes,
    balance: { earned: totals.instructor, paid, pending: totals.instructor - paid },
  });
});

// ---------- Bosh admin: o'tkazmalar (payout) ----------

const payoutSchema = z.object({
  instructorId: z.string().min(1, 'Ustoz tanlanmadi'),
  amount: z.number().int().positive('Summa musbat butun son bo\'lishi kerak'),
  method: z.string().max(60).optional(),
  note: z.string().max(500).optional(),
  status: z.enum(['PENDING', 'PAID']).default('PAID'),
  periodFrom: z.string().optional(),
  periodTo: z.string().optional(),
  paidAt: z.string().optional(),
});

// Yaroqli sana bo'lsa Date, aks holda null
function parseDate(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

// POST /api/admin/payouts — ustoz hisobiga o'tkazma qo'shish
const createPayout = asyncHandler(async (req, res) => {
  const data = payoutSchema.parse(req.body);

  const instructor = await prisma.user.findUnique({
    where: { id: data.instructorId },
    select: { id: true, role: true, fullName: true },
  });
  if (!instructor || instructor.role !== 'INSTRUCTOR') {
    throw ApiError.notFound('Ustoz topilmadi');
  }

  const payout = await prisma.payout.create({
    data: {
      instructorId: instructor.id,
      amount: data.amount,
      status: data.status,
      method: data.method || null,
      note: data.note || null,
      periodFrom: parseDate(data.periodFrom),
      periodTo: parseDate(data.periodTo),
      paidAt: data.status === 'PAID' ? (parseDate(data.paidAt) || new Date()) : null,
      createdById: req.user.id,
    },
    include: { createdBy: { select: { fullName: true } } },
  });

  res.status(201).json({ success: true, message: 'O\'tkazma qo\'shildi', payout });
});

// PATCH /api/admin/payouts/:id — holatni yangilash (PENDING -> PAID)
const updatePayout = asyncHandler(async (req, res) => {
  const existing = await prisma.payout.findUnique({ where: { id: req.params.id } });
  if (!existing) throw ApiError.notFound('O\'tkazma topilmadi');

  const status = ['PENDING', 'PAID'].includes(req.body.status) ? req.body.status : existing.status;
  const payout = await prisma.payout.update({
    where: { id: req.params.id },
    data: {
      status,
      paidAt: status === 'PAID' ? (existing.paidAt || new Date()) : null,
      method: req.body.method !== undefined ? (req.body.method || null) : existing.method,
      note: req.body.note !== undefined ? (req.body.note || null) : existing.note,
    },
  });
  res.json({ success: true, message: 'O\'tkazma yangilandi', payout });
});

// DELETE /api/admin/payouts/:id
const deletePayout = asyncHandler(async (req, res) => {
  const existing = await prisma.payout.findUnique({ where: { id: req.params.id } });
  if (!existing) throw ApiError.notFound('O\'tkazma topilmadi');
  await prisma.payout.delete({ where: { id: req.params.id } });
  res.json({ success: true, message: 'O\'tkazma o\'chirildi' });
});

// GET /api/admin/payouts — barcha o'tkazmalar (bosh admin)
const listPayouts = asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.instructorId) where.instructorId = req.query.instructorId;
  const payouts = await prisma.payout.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, amount: true, status: true, method: true, note: true,
      periodFrom: true, periodTo: true, paidAt: true, createdAt: true,
      instructor: { select: { id: true, fullName: true, email: true } },
      createdBy: { select: { fullName: true } },
    },
  });
  res.json({ success: true, payouts });
});

// ---------- Bosh admin: foiz sozlamalari ----------

// GET /api/admin/payout-config
const getConfig = asyncHandler(async (req, res) => {
  res.json({ success: true, config: await getPayoutConfig() });
});

// PUT /api/admin/payout-config
// Diqqat: o'zgarish faqat KEYINGI sotuvlarga ta'sir qiladi — mavjud daromad
// yozuvlarida foizlar snapshot qilingan va qayta hisoblanmaydi.
const updateConfig = asyncHandler(async (req, res) => {
  const config = normalizePayoutConfig(req.body);
  await setSetting(PAYOUT_KEY, config);
  res.json({
    success: true,
    message: 'Sozlama saqlandi. O\'zgarish faqat keyingi sotuvlarga qo\'llanadi.',
    config,
  });
});

module.exports = {
  myEarnings,
  myTransactions,
  myTransactionsCsv,
  myPayouts,
  adminOverview,
  adminTransactionsCsv,
  adminInstructorDetail,
  createPayout,
  updatePayout,
  deletePayout,
  listPayouts,
  getConfig,
  updateConfig,
};
