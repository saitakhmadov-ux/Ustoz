// IELTS topshiriqlarini admin panelidan boshqarish.
//
// Topshiriq mazmuni (savol, diagramma ma'lumoti, rasm, minimal so'z, vaqt)
// shu yerdan tahrirlanadi — kod ichida qattiq yozilgan matn yo'q.
// Rasm yuklash uchun mavjud `/api/admin/upload-image` ishlatiladi.
const { z } = require('zod');
const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

const TYPES = ['ACADEMIC_T1', 'GENERAL_T1', 'TASK2', 'TYPING', 'VOCAB'];
const VISUALS = ['NONE', 'LINE', 'BAR', 'PIE', 'TABLE', 'PROCESS', 'MAP'];
const CHART_VISUALS = ['LINE', 'BAR', 'PIE', 'TABLE'];

// Diagramma ma'lumoti: yorliqlar va har bir seriya qiymatlari.
// Qiymatlar soni yorliqlar soniga TENG bo'lishi shart — aks holda diagramma
// noto'g'ri chiziladi.
const chartSchema = z.object({
  unit: z.string().max(20).optional().nullable(),
  caption: z.string().max(200).optional().nullable(),
  labels: z.array(z.string().min(1).max(40)).min(2).max(24),
  series: z.array(z.object({
    name: z.string().min(1).max(60),
    values: z.array(z.number()).min(2).max(24),
  })).min(1).max(6),
});

const taskSchema = z.object({
  type: z.enum(TYPES),
  subtype: z.string().max(60).optional().nullable(),
  level: z.enum(['EASY', 'MEDIUM', 'HARD']).optional().nullable(),
  title: z.string().min(3, 'Nom juda qisqa').max(140),
  prompt: z.string().min(10, 'Savol matni juda qisqa').max(4000),
  visual: z.enum(VISUALS).optional(),
  chartData: chartSchema.optional().nullable(),
  imageUrl: z.string().max(500).optional().nullable(),
  dataSummary: z.string().max(2000).optional().nullable(),
  body: z.string().max(4000).optional().nullable(),
  minWords: z.number().int().min(20).max(1000).optional().nullable(),
  durationSec: z.number().int().min(60).max(7200).optional().nullable(),
  active: z.boolean().optional(),
  order: z.number().int().min(0).max(999).optional(),
});

// Rasm faqat saytga yuklangan fayl yoki HTTPS havola bo'lishi mumkin
function safeImage(url) {
  const s = (url || '').trim();
  if (!s) return null;
  if (s.startsWith('/uploads/') || /^https:\/\//i.test(s)) return s.slice(0, 500);
  throw ApiError.badRequest('Rasm havolasi noto\'g\'ri (/uploads/... yoki https:// bo\'lishi kerak)');
}

// Ma'lumotlar bir-biriga mos kelishini tekshiradi
function validate(data) {
  const visual = data.visual || 'NONE';

  if (CHART_VISUALS.includes(visual)) {
    if (!data.chartData) throw ApiError.badRequest('Bu diagramma turi uchun ma\'lumot kiritilishi kerak');
    const n = data.chartData.labels.length;
    const bad = data.chartData.series.find((s) => s.values.length !== n);
    if (bad) {
      throw ApiError.badRequest(`"${bad.name}" seriyasida ${bad.values.length} ta qiymat bor, yorliqlar esa ${n} ta`);
    }
  }

  if (data.type === 'VOCAB' && !data.level) {
    throw ApiError.badRequest('Lug\'at mashqi uchun daraja tanlang');
  }
  if (['TYPING', 'VOCAB'].includes(data.type) && !(data.body || '').trim()) {
    throw ApiError.badRequest('Mashq matni (so\'zlar yoki paragraf) kiritilishi kerak');
  }
}

// GET /api/admin/ielts/tasks?type=
const list = asyncHandler(async (req, res) => {
  const where = TYPES.includes(req.query.type) ? { type: req.query.type } : {};
  const [tasks, counts] = await Promise.all([
    prisma.ieltsTask.findMany({
      where,
      orderBy: [{ type: 'asc' }, { order: 'asc' }],
      include: { _count: { select: { attempts: true } } },
    }),
    prisma.ieltsTask.groupBy({ by: ['type'], _count: { _all: true } }),
  ]);
  res.json({
    success: true,
    tasks,
    counts: Object.fromEntries(counts.map((c) => [c.type, c._count._all])),
  });
});

// POST /api/admin/ielts/tasks
const create = asyncHandler(async (req, res) => {
  const data = taskSchema.parse(req.body);
  validate(data);

  // Qo'lda qo'shilgan topshiriqqa avtomatik kod beramiz (seed kodlari bilan
  // to'qnashmasligi uchun "MAN-" prefiksi)
  const code = `MAN-${Date.now().toString(36).toUpperCase()}`;

  const task = await prisma.ieltsTask.create({
    data: {
      code,
      type: data.type,
      subtype: data.subtype || null,
      level: data.level || null,
      title: data.title,
      prompt: data.prompt,
      visual: data.visual || 'NONE',
      chartData: data.chartData || undefined,
      imageUrl: safeImage(data.imageUrl),
      dataSummary: data.dataSummary || null,
      body: data.body || null,
      minWords: data.minWords ?? null,
      durationSec: data.durationSec ?? null,
      active: data.active ?? true,
      order: data.order ?? 0,
    },
  });
  res.status(201).json({ success: true, message: 'Topshiriq qo\'shildi', task });
});

// PUT /api/admin/ielts/tasks/:id
const update = asyncHandler(async (req, res) => {
  const existing = await prisma.ieltsTask.findUnique({ where: { id: req.params.id } });
  if (!existing) throw ApiError.notFound('Topshiriq topilmadi');

  const data = taskSchema.partial().parse(req.body);
  const merged = { ...existing, ...data };
  validate(merged);

  const task = await prisma.ieltsTask.update({
    where: { id: req.params.id },
    data: {
      ...(data.type !== undefined && { type: data.type }),
      ...(data.subtype !== undefined && { subtype: data.subtype || null }),
      ...(data.level !== undefined && { level: data.level || null }),
      ...(data.title !== undefined && { title: data.title }),
      ...(data.prompt !== undefined && { prompt: data.prompt }),
      ...(data.visual !== undefined && { visual: data.visual }),
      ...(data.chartData !== undefined && { chartData: data.chartData || null }),
      ...(data.imageUrl !== undefined && { imageUrl: safeImage(data.imageUrl) }),
      ...(data.dataSummary !== undefined && { dataSummary: data.dataSummary || null }),
      ...(data.body !== undefined && { body: data.body || null }),
      ...(data.minWords !== undefined && { minWords: data.minWords ?? null }),
      ...(data.durationSec !== undefined && { durationSec: data.durationSec ?? null }),
      ...(data.active !== undefined && { active: data.active }),
      ...(data.order !== undefined && { order: data.order }),
    },
  });
  res.json({ success: true, message: 'Topshiriq yangilandi', task });
});

// DELETE /api/admin/ielts/tasks/:id
const remove = asyncHandler(async (req, res) => {
  const task = await prisma.ieltsTask.findUnique({
    where: { id: req.params.id },
    include: { _count: { select: { attempts: true } } },
  });
  if (!task) throw ApiError.notFound('Topshiriq topilmadi');

  // Ishlangan topshiriqni o'chirish tarixni buzadi — nofaol qilishni taklif qilamiz
  if (task._count.attempts > 0) {
    throw ApiError.badRequest(
      `Bu topshiriq ${task._count.attempts} marta ishlangan. O'chirish o'rniga uni "nofaol" qiling — `
      + 'shunda yangi mashqlarda chiqmaydi, ammo eski natijalar saqlanib qoladi.',
    );
  }

  await prisma.ieltsTask.delete({ where: { id: req.params.id } });
  res.json({ success: true, message: 'Topshiriq o\'chirildi' });
});

module.exports = { list, create, update, remove };
