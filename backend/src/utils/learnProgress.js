// Vazifa-darajali progress va kursdan foydalanish muddati bilan ishlash yordamchilari.
// Bu fayl sof (prisma'siz) — controllerlar prisma so'rovlarini o'zi bajaradi.

// Kurs qiyinchilik darajasiga qarab foydalanish muddati (oylarda).
const ACCESS_MONTHS = {
  BEGINNER: 1, // boshlang'ich — 1 oy
  INTERMEDIATE: 2, // o'rta — 2 oy
  ADVANCED: 3, // yuqori — 3 oy
};

function accessMonths(level) {
  return ACCESS_MONTHS[level] ?? 1;
}

// Kursning amaldagi foydalanish muddati (oylarda).
// Kursda aniq belgilangan bo'lsa (accessMonths) — o'sha, aks holda daraja bo'yicha standart.
function accessMonthsFor(course) {
  if (course && Number.isInteger(course.accessMonths) && course.accessMonths > 0) {
    return course.accessMonths;
  }
  return accessMonths(course && course.level);
}

// Yozilув muddatini hisoblash: from + N oy. months — son (oy).
function computeExpiry(months, from = new Date()) {
  const n = Number.isInteger(months) && months > 0 ? months : 1;
  const d = new Date(from);
  d.setMonth(d.getMonth() + n);
  return d;
}

// Berilgan darsning vazifalari ro'yxati (video, matn, materiallar, test).
// lesson obyekti: { id, videoUrl, content, materials:[{id,type,title}], questions:[...] }
// Hech qanday komponent bo'lmasa — bitta sun'iy "done" vazifasi qaytadi.
function lessonTasks(lesson) {
  const tasks = [];
  if (lesson.videoUrl) {
    tasks.push({ key: `video:${lesson.id}`, type: 'VIDEO', label: 'Asosiy videoni ko\'rish' });
  }
  if (lesson.content && String(lesson.content).trim().length > 0) {
    tasks.push({ key: `content:${lesson.id}`, type: 'CONTENT', label: 'Matnli materialni o\'qish' });
  }
  for (const m of lesson.materials || []) {
    tasks.push({
      key: `material:${m.id}`,
      type: m.type === 'PDF' ? 'PDF' : 'MATERIAL_VIDEO',
      label: m.type === 'PDF' ? `PDF: ${m.title}` : `Video: ${m.title}`,
      materialId: m.id,
    });
  }
  if ((lesson.questions || []).length > 0) {
    tasks.push({ key: `quiz:${lesson.id}`, type: 'QUIZ', label: 'Testdan o\'tish' });
  }
  if (tasks.length === 0) {
    tasks.push({ key: `done:${lesson.id}`, type: 'DONE', label: 'Darsni yakunlash' });
  }
  return tasks;
}

// Vazifa kaliti — sun'iy testdan tashqari qo'lda belgilanishi mumkinmi?
// Testning kaliti faqat testdan o'tilganda (submitQuiz) belgilanadi.
function isManualTaskKey(key) {
  return !String(key).startsWith('quiz:');
}

// ---------- Test (quiz) yordamchilari ----------

// Test foydalanuvchiga ochilishi uchun bazada kamida shuncha savol bo'lishi kerak.
// draw=10 -> 20, draw=40 -> 80. Foydalanuvchi yodlab olmasligi uchun bazada draw'dan
// kamida ikki barobar ko'p savol talab qilinadi.
function quizRequiredBank(draw) {
  const d = Number.isInteger(draw) && draw > 0 ? draw : 10;
  return d * 2;
}

// "Sof test-dars" — faqat savoldan iborat (video/matn/material yo'q). Bunday darslar
// yangi test tizimining maqsadi: baza ≥ 2×draw talab qilinadi va tasodifiy draw beriladi.
// Video/matn bilan ARALASH darsdagi kichik test (eski uslub) — bu shart qo'llanmaydi,
// barcha savol beriladi (mavjud kurslar buzilmasligi uchun).
function isPureTestLesson(lesson) {
  const hasVideo = !!lesson.videoUrl;
  const hasContent = !!(lesson.content && String(lesson.content).trim());
  const hasMaterials = (lesson.materials || []).length > 0;
  const hasQuestions = (lesson.questions || []).length > 0;
  return hasQuestions && !hasVideo && !hasContent && !hasMaterials;
}

// Kuldown holati. lastFailedAt — oxirgi YIQILGAN urinish vaqti (yoki null).
// hours — quizCooldownHours. Qaytaradi: { active, remainingMs, until }.
function quizCooldownInfo(lastFailedAt, hours) {
  if (!lastFailedAt) return { active: false, remainingMs: 0, until: null };
  const h = Number.isInteger(hours) && hours >= 0 ? hours : 3;
  const until = new Date(new Date(lastFailedAt).getTime() + h * 60 * 60 * 1000);
  const remainingMs = until.getTime() - Date.now();
  if (remainingMs <= 0) return { active: false, remainingMs: 0, until };
  return { active: true, remainingMs, until };
}

// Massivdan tasodifiy n ta element (Fisher-Yates aralashtirib, kesib olamiz).
function pickRandom(arr, n) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, Math.min(n, a.length));
}

// Muddat holatini hisoblash. expiresAt null bo'lsa — muddatsiz (eski yozilishlar).
// level berilsa, qolgan vaqtning umumiy muddatga nisbati (ratioLeft, 0..1) ham hisoblanadi —
// frontend ranglash uchun (1=to'liq, 0.5=yarmi, 0=tugadi). Muddat darajaga bog'liq
// bo'lgani uchun nisbat qayta yozilishdan keyin ham barqaror qoladi.
function accessInfo(expiresAt, totalMonths) {
  if (!expiresAt) {
    return { expiresAt: null, expired: false, daysLeft: null, msLeft: null, ratioLeft: null };
  }
  const exp = new Date(expiresAt);
  const msLeft = exp.getTime() - Date.now();
  const expired = msLeft <= 0;
  const daysLeft = expired ? 0 : Math.ceil(msLeft / (1000 * 60 * 60 * 24));
  let ratioLeft = null;
  if (totalMonths) {
    const totalMs = totalMonths * 30.44 * 24 * 60 * 60 * 1000; // taxminiy oy uzunligi
    ratioLeft = Math.max(0, Math.min(1, msLeft / totalMs));
  }
  return { expiresAt: exp, expired, daysLeft, msLeft, ratioLeft };
}

module.exports = {
  ACCESS_MONTHS,
  accessMonths,
  accessMonthsFor,
  computeExpiry,
  lessonTasks,
  isManualTaskKey,
  accessInfo,
  quizRequiredBank,
  isPureTestLesson,
  quizCooldownInfo,
  pickRandom,
};
