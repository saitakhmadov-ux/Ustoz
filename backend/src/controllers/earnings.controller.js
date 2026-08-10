// Ustoz maoshi (daromadi) hisobotlari.
//
// Ustoz (INSTRUCTOR) faqat o'z daromadini ko'radi, bosh admin (ADMIN) esa
// barcha ustozlar bo'yicha umumiy manzarani va har bir ustoz kesimini ko'radi.
//
// Barcha summalar Earning yozuvlaridan olinadi — foizlar o'sha yozuvda snapshot
// qilingani uchun sozlama keyin o'zgarsa ham tarixiy hisobot o'zgarmaydi.
const { z } = require('zod');
const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { periodRange, growthPct, monthlySeries } = require('../utils/period');
const { getPayoutConfig, setSetting, PAYOUT_KEY } = require('../utils/settings');
const { normalizePayoutConfig } = require('../utils/earnings');
const { sendCsv, csvDate } = require('../utils/csv');

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

// Earning yozuvlarini yig'indiga aylantiradi
function sumEarnings(rows) {
  return rows.reduce((acc, e) => ({
    sales: acc.sales + 1,
    gross: acc.gross + e.grossAmount,
    tax: acc.tax + e.taxAmount,
    net: acc.net + e.netAmount,
    instructor: acc.instructor + e.instructorAmount,
    platform: acc.platform + e.platformAmount,
  }), emptySums());
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

  const [all, courses, config] = await Promise.all([
    prisma.earning.findMany({
      where: scope,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, createdAt: true, courseId: true, source: true,
        grossAmount: true, taxAmount: true, netAmount: true,
        instructorAmount: true, platformAmount: true, sharePct: true, taxPct: true,
        course: { select: { id: true, title: true, slug: true } },
      },
    }),
    prisma.course.findMany({
      where: req.user.role === 'INSTRUCTOR' ? { instructorId: req.user.id } : {},
      select: { id: true, title: true, slug: true, price: true, isFree: true },
    }),
    getPayoutConfig(),
  ]);

  // Davr kesimlari
  const inPeriod = from ? all.filter((e) => e.createdAt >= from) : all;
  const inPrev = from && prevFrom
    ? all.filter((e) => e.createdAt >= prevFrom && e.createdAt < from)
    : [];

  const totals = sumEarnings(all);
  const periodSums = sumEarnings(inPeriod);
  const prevSums = sumEarnings(inPrev);

  // Manba kesimi (organik / promo kod orqali)
  const organic = sumEarnings(all.filter((e) => e.source === 'ORGANIC'));
  const referral = sumEarnings(all.filter((e) => e.source === 'REFERRAL'));

  // Shu oy
  const mStart = monthStart();
  const thisMonth = sumEarnings(all.filter((e) => e.createdAt >= mStart));
  // O'tgan oy — taqqoslash uchun
  const prevMonthStart = new Date(mStart.getFullYear(), mStart.getMonth() - 1, 1);
  const lastMonth = sumEarnings(
    all.filter((e) => e.createdAt >= prevMonthStart && e.createdAt < mStart)
  );

  // 12 oylik qator (ustoz ulushi va sotuvlar)
  const monthlyInstructor = monthlySeries(all, 12, (e) => e.instructorAmount);
  const monthlySales = monthlySeries(all, 12, () => 1);
  const monthlyGross = monthlySeries(all, 12, (e) => e.grossAmount);
  const monthly = monthlyInstructor.map((m, i) => ({
    month: m.month,
    instructor: m.value,
    sales: monthlySales[i].value,
    gross: monthlyGross[i].value,
  }));

  // Kurs kesimi — daromad keltirmagan pulli kurslar ham ko'rinadi (0 bilan)
  const byCourseMap = new Map();
  for (const c of courses) {
    if (c.isFree || c.price === 0) continue;
    byCourseMap.set(c.id, {
      courseId: c.id, title: c.title, slug: c.slug, ...emptySums(),
      organicInstructor: 0, referralInstructor: 0,
    });
  }
  for (const e of all) {
    if (!byCourseMap.has(e.courseId)) {
      byCourseMap.set(e.courseId, {
        courseId: e.courseId,
        title: e.course ? e.course.title : '—',
        slug: e.course ? e.course.slug : '',
        ...emptySums(),
        organicInstructor: 0,
        referralInstructor: 0,
      });
    }
    const row = byCourseMap.get(e.courseId);
    row.sales += 1;
    row.gross += e.grossAmount;
    row.tax += e.taxAmount;
    row.net += e.netAmount;
    row.instructor += e.instructorAmount;
    row.platform += e.platformAmount;
    if (e.source === 'REFERRAL') row.referralInstructor += e.instructorAmount;
    else row.organicInstructor += e.instructorAmount;
  }
  const byCourse = [...byCourseMap.values()].sort((a, b) => b.instructor - a.instructor);

  // Balans: ishlangan - hisobga o'tkazilgan
  const payoutWhere = req.user.role === 'INSTRUCTOR' ? { instructorId: req.user.id } : {};
  const paid = await paidPayoutsSum(payoutWhere);

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
      ...periodSums,
      growth: {
        instructor: growthPct(periodSums.instructor, prevSums.instructor),
        sales: growthPct(periodSums.sales, prevSums.sales),
        gross: growthPct(periodSums.gross, prevSums.gross),
      },
    },
    thisMonth: {
      ...thisMonth,
      growth: growthPct(thisMonth.instructor, lastMonth.instructor),
    },
    lastMonth,
    bySource: { organic, referral },
    monthly,
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

// GET /api/admin/teaching/earnings/export — CSV yuklab olish
const myTransactionsCsv = asyncHandler(async (req, res) => {
  const where = { ...earningScope(req.user, null) };
  if (req.query.courseId) where.courseId = req.query.courseId;
  if (['ORGANIC', 'REFERRAL'].includes(req.query.source)) where.source = req.query.source;
  const range = dateFilter(req.query);
  if (range) where.createdAt = range;

  const rows = await prisma.earning.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: {
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
    },
  });

  const stamp = new Date().toISOString().slice(0, 10);
  sendCsv(res, `maosh-hisoboti-${stamp}.csv`, TX_COLUMNS, rows.map(flattenTx));
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

  const [all, instructors, payouts, config, unassigned] = await Promise.all([
    prisma.earning.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, createdAt: true, instructorId: true, courseId: true, source: true,
        grossAmount: true, taxAmount: true, netAmount: true,
        instructorAmount: true, platformAmount: true,
      },
    }),
    prisma.user.findMany({
      where: { role: 'INSTRUCTOR' },
      select: {
        id: true, fullName: true, email: true,
        taughtCourses: { select: { id: true, title: true } },
      },
    }),
    prisma.payout.findMany({
      where: { status: 'PAID' },
      select: { instructorId: true, amount: true, createdAt: true, paidAt: true },
    }),
    getPayoutConfig(),
    // Ustozi biriktirilmagan kurslardan tushgan to'lovlar — daromad yozuvi
    // yaratilmaydi, butun mablag' tizimga qoladi. Alohida ko'rsatamiz.
    prisma.payment.aggregate({
      where: { status: 'PAID', course: { instructorId: null } },
      _sum: { amount: true },
      _count: true,
    }),
  ]);

  const inPeriod = from ? all.filter((e) => e.createdAt >= from) : all;
  const inPrev = from && prevFrom
    ? all.filter((e) => e.createdAt >= prevFrom && e.createdAt < from)
    : [];

  const totals = sumEarnings(all);
  const periodSums = sumEarnings(inPeriod);
  const prevSums = sumEarnings(inPrev);
  const organic = sumEarnings(all.filter((e) => e.source === 'ORGANIC'));
  const referral = sumEarnings(all.filter((e) => e.source === 'REFERRAL'));

  const mStart = monthStart();
  const thisMonth = sumEarnings(all.filter((e) => e.createdAt >= mStart));
  const prevMonthStart = new Date(mStart.getFullYear(), mStart.getMonth() - 1, 1);
  const lastMonth = sumEarnings(
    all.filter((e) => e.createdAt >= prevMonthStart && e.createdAt < mStart)
  );

  const monthlyInstructor = monthlySeries(all, 12, (e) => e.instructorAmount);
  const monthlyPlatform = monthlySeries(all, 12, (e) => e.platformAmount);
  const monthlyTax = monthlySeries(all, 12, (e) => e.taxAmount);
  const monthlyGross = monthlySeries(all, 12, (e) => e.grossAmount);
  const monthly = monthlyInstructor.map((m, i) => ({
    month: m.month,
    instructor: m.value,
    platform: monthlyPlatform[i].value,
    tax: monthlyTax[i].value,
    gross: monthlyGross[i].value,
  }));

  // Ustoz kesimi: ishlangan / to'langan / qoldiq
  const paidByInstructor = {};
  for (const p of payouts) {
    paidByInstructor[p.instructorId] = (paidByInstructor[p.instructorId] || 0) + p.amount;
  }
  const byInstructorMap = new Map();
  for (const i of instructors) {
    byInstructorMap.set(i.id, {
      instructorId: i.id,
      fullName: i.fullName,
      email: i.email,
      courses: i.taughtCourses.length,
      ...emptySums(),
      organicInstructor: 0,
      referralInstructor: 0,
      paid: paidByInstructor[i.id] || 0,
      pending: 0,
    });
  }
  for (const e of all) {
    if (!byInstructorMap.has(e.instructorId)) {
      // Ustoz o'chirilgan bo'lsa ham daromad tarixi qoladi
      byInstructorMap.set(e.instructorId, {
        instructorId: e.instructorId,
        fullName: "O'chirilgan ustoz",
        email: '',
        courses: 0,
        ...emptySums(),
        organicInstructor: 0,
        referralInstructor: 0,
        paid: paidByInstructor[e.instructorId] || 0,
        pending: 0,
      });
    }
    const row = byInstructorMap.get(e.instructorId);
    row.sales += 1;
    row.gross += e.grossAmount;
    row.tax += e.taxAmount;
    row.net += e.netAmount;
    row.instructor += e.instructorAmount;
    row.platform += e.platformAmount;
    if (e.source === 'REFERRAL') row.referralInstructor += e.instructorAmount;
    else row.organicInstructor += e.instructorAmount;
  }
  const byInstructor = [...byInstructorMap.values()]
    .map((r) => ({ ...r, pending: r.instructor - r.paid }))
    .sort((a, b) => b.instructor - a.instructor);

  const totalPaid = payouts.reduce((s, p) => s + p.amount, 0);

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
      ...periodSums,
      growth: {
        gross: growthPct(periodSums.gross, prevSums.gross),
        platform: growthPct(periodSums.platform, prevSums.platform),
        instructor: growthPct(periodSums.instructor, prevSums.instructor),
        sales: growthPct(periodSums.sales, prevSums.sales),
      },
    },
    thisMonth: { ...thisMonth, growth: growthPct(thisMonth.gross, lastMonth.gross) },
    lastMonth,
    bySource: { organic, referral },
    monthly,
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
  const where = {};
  if (req.query.instructorId) where.instructorId = req.query.instructorId;
  if (['ORGANIC', 'REFERRAL'].includes(req.query.source)) where.source = req.query.source;
  const range = dateFilter(req.query);
  if (range) where.createdAt = range;

  const rows = await prisma.earning.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      createdAt: true, source: true, sharePct: true, taxPct: true,
      grossAmount: true, taxAmount: true, netAmount: true,
      instructorAmount: true, platformAmount: true,
      instructor: { select: { fullName: true } },
      course: { select: { title: true } },
      promoCode: { select: { code: true } },
      payment: {
        select: {
          originalAmount: true, discountPct: true,
          user: { select: { fullName: true, email: true } },
        },
      },
    },
  });

  const columns = [
    { key: 'createdAt', label: 'Sana', format: csvDate },
    { key: 'instructorName', label: 'Ustoz' },
    ...TX_COLUMNS.slice(1),
  ];
  const stamp = new Date().toISOString().slice(0, 10);
  sendCsv(
    res,
    `maosh-umumiy-${stamp}.csv`,
    columns,
    rows.map((e) => ({ ...flattenTx(e), instructorName: e.instructor ? e.instructor.fullName : '' }))
  );
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

  const [earnings, payouts, promoCodes] = await Promise.all([
    prisma.earning.findMany({
      where: { instructorId: instructor.id },
      orderBy: { createdAt: 'desc' },
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
      where: { instructorId: instructor.id },
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

  const totals = sumEarnings(earnings);
  const paid = payouts.filter((p) => p.status === 'PAID').reduce((s, p) => s + p.amount, 0);
  const monthlyInstructor = monthlySeries(earnings, 12, (e) => e.instructorAmount);

  res.json({
    success: true,
    instructor,
    totals,
    bySource: {
      organic: sumEarnings(earnings.filter((e) => e.source === 'ORGANIC')),
      referral: sumEarnings(earnings.filter((e) => e.source === 'REFERRAL')),
    },
    monthly: monthlyInstructor.map((m) => ({ month: m.month, instructor: m.value })),
    earnings: earnings.slice(0, 100),
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
