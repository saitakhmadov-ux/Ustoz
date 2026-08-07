// Kurs egaligini tekshirish yordamchilari.
// Bosh admin (ADMIN) barcha kurslarga ega. Ustoz (INSTRUCTOR) faqat o'ziga
// biriktirilgan kurs(lar) bilan ishlay oladi.
const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');

// Berilgan courseId ustidan foydalanuvchi huquqini tekshiradi.
// Ruxsat bo'lmasa xatolik otadi, aks holda kursni qaytaradi.
async function assertCourseAccess(user, courseId) {
  if (!courseId) throw ApiError.badRequest('Kurs aniqlanmadi');
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, instructorId: true },
  });
  if (!course) throw ApiError.notFound('Kurs topilmadi');
  if (user.role === 'ADMIN') return course;
  if (user.role === 'INSTRUCTOR' && course.instructorId === user.id) return course;
  throw ApiError.forbidden('Bu kurs sizga biriktirilmagan');
}

// Bo'lim id sidan kursni topib, huquqni tekshiradi
async function assertSectionAccess(user, sectionId) {
  const section = await prisma.section.findUnique({
    where: { id: sectionId },
    select: { courseId: true },
  });
  if (!section) throw ApiError.notFound('Bo\'lim topilmadi');
  return assertCourseAccess(user, section.courseId);
}

// Dars id sidan kursni topib, huquqni tekshiradi
async function assertLessonAccess(user, lessonId) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { section: { select: { courseId: true } } },
  });
  if (!lesson) throw ApiError.notFound('Dars topilmadi');
  return assertCourseAccess(user, lesson.section.courseId);
}

// Test savoli id sidan kursni topib, huquqni tekshiradi
async function assertQuestionAccess(user, questionId) {
  const q = await prisma.quizQuestion.findUnique({
    where: { id: questionId },
    select: { lesson: { select: { section: { select: { courseId: true } } } } },
  });
  if (!q) throw ApiError.notFound('Savol topilmadi');
  return assertCourseAccess(user, q.lesson.section.courseId);
}

// Material id sidan kursni topib, huquqni tekshiradi
async function assertMaterialAccess(user, materialId) {
  const m = await prisma.lessonMaterial.findUnique({
    where: { id: materialId },
    select: { lesson: { select: { section: { select: { courseId: true } } } } },
  });
  if (!m) throw ApiError.notFound('Material topilmadi');
  return assertCourseAccess(user, m.lesson.section.courseId);
}

module.exports = {
  assertCourseAccess,
  assertSectionAccess,
  assertLessonAccess,
  assertQuestionAccess,
  assertMaterialAccess,
};
