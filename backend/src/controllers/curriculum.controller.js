// O'quv dasturi controlleri (admin/ustoz) — bo'lim, dars, test, material CRUD
const { z } = require('zod');
const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const {
  assertCourseAccess, assertSectionAccess, assertLessonAccess,
  assertQuestionAccess, assertMaterialAccess,
} = require('../utils/courseAccess');
const { normalizeDrill } = require('../utils/typing');

// ---------- Validatsiya ----------
const sectionSchema = z.object({
  courseId: z.string().min(1),
  title: z.string().min(2, 'Bo\'lim nomi juda qisqa').max(120),
  order: z.number().int().min(0).optional(),
});

const lessonSchema = z.object({
  sectionId: z.string().min(1),
  title: z.string().min(2, 'Dars nomi juda qisqa').max(160),
  order: z.number().int().min(0).optional(),
  videoUrl: z.string().url('Video URL noto\'g\'ri').optional().nullable().or(z.literal('')),
  content: z.string().optional().nullable(),
  isFreePreview: z.boolean().optional(),
  // Test sozlamalari (ixtiyoriy — darsda savollar bo'lsa qo'llanadi)
  quizDraw: z.number().int().min(1).max(100).optional(),
  quizPassPercent: z.number().int().min(1).max(100).optional(),
  quizTimePerQ: z.number().int().min(5).max(600).optional(),
  quizCooldownHours: z.number().int().min(0).max(72).optional(),
});

const questionSchema = z.object({
  lessonId: z.string().min(1),
  question: z.string().min(3, 'Savol juda qisqa'),
  imageUrl: z.string().optional().nullable(),
  options: z.array(z.string().min(1)).min(2, 'Kamida 2 ta variant kerak').max(6),
  correctIndex: z.number().int().min(0),
});

const materialSchema = z.object({
  lessonId: z.string().min(1),
  type: z.enum(['VIDEO', 'PDF']),
  title: z.string().min(1, 'Nom shart').max(160),
  url: z.string().min(1, 'URL yoki fayl shart'),
});

// GET /api/admin/courses/:id/curriculum — tahrirlash uchun to'liq kurs
const getCurriculum = asyncHandler(async (req, res) => {
  await assertCourseAccess(req.user, req.params.id);
  const course = await prisma.course.findUnique({
    where: { id: req.params.id },
    include: {
      category: { select: { id: true, name: true } },
      instructor: { select: { id: true, fullName: true, email: true } },
      sections: {
        orderBy: { order: 'asc' },
        include: {
          lessons: {
            orderBy: { order: 'asc' },
            include: {
              questions: { orderBy: { id: 'asc' } },
              materials: { orderBy: { createdAt: 'asc' } },
              typingDrill: true, // klaviatura mashqi (TYPING kurslarida)
            },
          },
        },
      },
    },
  });
  if (!course) throw ApiError.notFound('Kurs topilmadi');
  res.json({ success: true, course });
});

// ---------- Bo'limlar ----------
const createSection = asyncHandler(async (req, res) => {
  const data = sectionSchema.parse(req.body);
  await assertCourseAccess(req.user, data.courseId);
  const count = await prisma.section.count({ where: { courseId: data.courseId } });
  const section = await prisma.section.create({
    data: { courseId: data.courseId, title: data.title, order: data.order ?? count },
  });
  res.status(201).json({ success: true, message: 'Bo\'lim qo\'shildi', section });
});

const updateSection = asyncHandler(async (req, res) => {
  await assertSectionAccess(req.user, req.params.id);
  const data = sectionSchema.partial().parse(req.body);
  const section = await prisma.section.update({
    where: { id: req.params.id },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.order !== undefined && { order: data.order }),
    },
  });
  res.json({ success: true, message: 'Bo\'lim yangilandi', section });
});

const deleteSection = asyncHandler(async (req, res) => {
  await assertSectionAccess(req.user, req.params.id);
  await prisma.section.delete({ where: { id: req.params.id } });
  res.json({ success: true, message: 'Bo\'lim o\'chirildi' });
});

// ---------- Darslar ----------
const createLesson = asyncHandler(async (req, res) => {
  const data = lessonSchema.parse(req.body);
  await assertSectionAccess(req.user, data.sectionId);
  const count = await prisma.lesson.count({ where: { sectionId: data.sectionId } });
  const lesson = await prisma.lesson.create({
    data: {
      sectionId: data.sectionId,
      title: data.title,
      order: data.order ?? count,
      videoUrl: data.videoUrl || null,
      content: data.content || null,
      isFreePreview: data.isFreePreview ?? false,
      ...(data.quizDraw !== undefined && { quizDraw: data.quizDraw }),
      ...(data.quizPassPercent !== undefined && { quizPassPercent: data.quizPassPercent }),
      ...(data.quizTimePerQ !== undefined && { quizTimePerQ: data.quizTimePerQ }),
      ...(data.quizCooldownHours !== undefined && { quizCooldownHours: data.quizCooldownHours }),
    },
  });
  res.status(201).json({ success: true, message: 'Dars qo\'shildi', lesson });
});

const updateLesson = asyncHandler(async (req, res) => {
  await assertLessonAccess(req.user, req.params.id);
  const data = lessonSchema.partial().parse(req.body);
  const lesson = await prisma.lesson.update({
    where: { id: req.params.id },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.order !== undefined && { order: data.order }),
      ...(data.videoUrl !== undefined && { videoUrl: data.videoUrl || null }),
      ...(data.content !== undefined && { content: data.content || null }),
      ...(data.isFreePreview !== undefined && { isFreePreview: data.isFreePreview }),
      ...(data.quizDraw !== undefined && { quizDraw: data.quizDraw }),
      ...(data.quizPassPercent !== undefined && { quizPassPercent: data.quizPassPercent }),
      ...(data.quizTimePerQ !== undefined && { quizTimePerQ: data.quizTimePerQ }),
      ...(data.quizCooldownHours !== undefined && { quizCooldownHours: data.quizCooldownHours }),
    },
  });
  res.json({ success: true, message: 'Dars yangilandi', lesson });
});

const deleteLesson = asyncHandler(async (req, res) => {
  await assertLessonAccess(req.user, req.params.id);
  await prisma.lesson.delete({ where: { id: req.params.id } });
  res.json({ success: true, message: 'Dars o\'chirildi' });
});

// ---------- Test savollari ----------
const createQuestion = asyncHandler(async (req, res) => {
  const data = questionSchema.parse(req.body);
  await assertLessonAccess(req.user, data.lessonId);
  if (data.correctIndex >= data.options.length) {
    throw ApiError.badRequest('To\'g\'ri javob indeksi variantlar sonidan katta');
  }
  const question = await prisma.quizQuestion.create({
    data: { ...data, imageUrl: data.imageUrl || null },
  });
  res.status(201).json({ success: true, message: 'Savol qo\'shildi', question });
});

const updateQuestion = asyncHandler(async (req, res) => {
  await assertQuestionAccess(req.user, req.params.id);
  const data = questionSchema.partial().parse(req.body);
  const question = await prisma.quizQuestion.update({
    where: { id: req.params.id },
    data: {
      ...(data.question !== undefined && { question: data.question }),
      ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl || null }),
      ...(data.options !== undefined && { options: data.options }),
      ...(data.correctIndex !== undefined && { correctIndex: data.correctIndex }),
    },
  });
  res.json({ success: true, message: 'Savol yangilandi', question });
});

const deleteQuestion = asyncHandler(async (req, res) => {
  await assertQuestionAccess(req.user, req.params.id);
  await prisma.quizQuestion.delete({ where: { id: req.params.id } });
  res.json({ success: true, message: 'Savol o\'chirildi' });
});

// ---------- Materiallar (video/PDF) ----------
const createMaterial = asyncHandler(async (req, res) => {
  const data = materialSchema.parse(req.body);
  await assertLessonAccess(req.user, data.lessonId);
  const material = await prisma.lessonMaterial.create({ data });
  res.status(201).json({ success: true, message: 'Material qo\'shildi', material });
});

const deleteMaterial = asyncHandler(async (req, res) => {
  await assertMaterialAccess(req.user, req.params.id);
  await prisma.lessonMaterial.delete({ where: { id: req.params.id } });
  res.json({ success: true, message: 'Material o\'chirildi' });
});

// ---------- Klaviatura mashqi (TYPING kurslari) ----------

// Mashq matnini tozalash pleerdagi bilan bir xil bo'lishi uchun shu yerda ham
// normalizeDrill ishlatiladi (ortiqcha probel/qator olib tashlanadi).
const drillSchema = z.object({
  mode: z.enum(['KEYS', 'WORDS', 'TEXT', 'TIMED']).default('TEXT'),
  content: z.string({ required_error: 'Mashq matni shart' }).min(4, 'Mashq matni juda qisqa').max(4000),
  targetWpm: z.number().int().min(1, 'Kamida 1').max(200).default(15),
  targetAccuracy: z.number().int().min(50, 'Kamida 50%').max(100).default(95),
  durationSec: z.number().int().min(10).max(600).optional().nullable(),
  showKeyboard: z.boolean().optional(),
  hint: z.string().max(300).optional().nullable(),
});

// PUT /api/admin/lessons/:id/typing — mashqni yaratadi yoki yangilaydi
const saveDrill = asyncHandler(async (req, res) => {
  await assertLessonAccess(req.user, req.params.id);
  const data = drillSchema.parse(req.body);

  const content = normalizeDrill(data.content);
  if (content.length < 4) throw ApiError.badRequest('Mashq matni juda qisqa');
  // TIMED rejimida davomiylik shart — aks holda mashq qachon tugashi noma'lum
  if (data.mode === 'TIMED' && !data.durationSec) {
    throw ApiError.badRequest('Vaqtli mashq uchun davomiylikni belgilang');
  }

  const values = {
    mode: data.mode,
    content,
    targetWpm: data.targetWpm,
    targetAccuracy: data.targetAccuracy,
    durationSec: data.mode === 'TIMED' ? data.durationSec : null,
    showKeyboard: data.showKeyboard ?? true,
    hint: data.hint || null,
  };

  const drill = await prisma.typingDrill.upsert({
    where: { lessonId: req.params.id },
    update: values,
    create: { lessonId: req.params.id, ...values },
  });
  res.json({ success: true, message: 'Mashq saqlandi', drill });
});

// DELETE /api/admin/lessons/:id/typing — mashqni olib tashlash
const deleteDrill = asyncHandler(async (req, res) => {
  await assertLessonAccess(req.user, req.params.id);
  await prisma.typingDrill.deleteMany({ where: { lessonId: req.params.id } });
  // Mashq yo'q bo'lgach uning vazifasi ham ma'nosiz — progress yozuvini tozalaymiz
  await prisma.taskProgress.deleteMany({ where: { taskKey: `typing:${req.params.id}` } });
  res.json({ success: true, message: 'Mashq o\'chirildi' });
});

module.exports = {
  getCurriculum,
  createSection, updateSection, deleteSection,
  createLesson, updateLesson, deleteLesson,
  createQuestion, updateQuestion, deleteQuestion,
  createMaterial, deleteMaterial,
  saveDrill, deleteDrill,
};
