// Xabar/bildirishnoma controlleri
// Yuborish: bosh admin (barcha/kurs/muayyan), ustoz (faqat o'z kursi o'quvchilari).
// Qabul qilish: foydalanuvchi o'z bildirishnomalarini ko'radi va o'qilgan deb belgilaydi.
const { z } = require('zod');
const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { assertCourseAccess } = require('../utils/courseAccess');
const { sendMail } = require('../utils/mailer');

const sendSchema = z.object({
  mode: z.enum(['users', 'course', 'all']),
  userIds: z.array(z.string().min(1)).optional(),
  courseId: z.string().min(1).optional(),
  title: z.string().min(2, 'Sarlavha juda qisqa').max(160),
  body: z.string().min(1, 'Xabar matni bo\'sh').max(4000),
  sendEmail: z.boolean().optional(),
});

// Ustozga biriktirilgan kurslarga yozilgan o'quvchilar id to'plami
async function instructorStudentIds(instructorId) {
  const courses = await prisma.course.findMany({
    where: { instructorId }, select: { id: true },
  });
  const ids = courses.map((c) => c.id);
  if (ids.length === 0) return new Set();
  const enr = await prisma.enrollment.findMany({
    where: { courseId: { in: ids } }, select: { userId: true },
  });
  return new Set(enr.map((e) => e.userId));
}

// Qabul qiluvchilarni aniqlash (rolga qarab cheklovlar bilan)
async function resolveRecipients(user, data) {
  const isAdmin = user.role === 'ADMIN';

  if (data.mode === 'all') {
    if (!isAdmin) throw ApiError.forbidden('Ustoz barcha foydalanuvchilarga yubora olmaydi');
    return prisma.user.findMany({
      where: { role: 'USER' }, select: { id: true, email: true, fullName: true },
    });
  }

  if (data.mode === 'course') {
    if (!data.courseId) throw ApiError.badRequest('courseId shart');
    const course = await prisma.course.findUnique({ where: { id: data.courseId } });
    if (!course) throw ApiError.notFound('Kurs topilmadi');
    // Ustoz bo'lsa — kurs unga biriktirilgan bo'lishi shart
    await assertCourseAccess(user, data.courseId);
    const enr = await prisma.enrollment.findMany({
      where: { courseId: data.courseId },
      select: { user: { select: { id: true, email: true, fullName: true } } },
    });
    return enr.map((e) => e.user);
  }

  // mode === 'users'
  if (!data.userIds || data.userIds.length === 0) {
    throw ApiError.badRequest('Kamida bitta foydalanuvchi tanlang');
  }
  const users = await prisma.user.findMany({
    where: { id: { in: data.userIds } },
    select: { id: true, email: true, fullName: true },
  });
  // Ustoz faqat o'z o'quvchilariga yubora oladi
  if (!isAdmin) {
    const allowed = await instructorStudentIds(user.id);
    const bad = users.find((u) => !allowed.has(u.id));
    if (bad) throw ApiError.forbidden('Faqat o\'z kurslaringiz o\'quvchilariga yubora olasiz');
  }
  return users;
}

// POST /api/admin/notifications — xabar yuborish
const send = asyncHandler(async (req, res) => {
  const data = sendSchema.parse(req.body);
  const recipientsRaw = await resolveRecipients(req.user, data);

  // Takrorlanmas qabul qiluvchilar
  const seen = new Set();
  const recipients = recipientsRaw.filter((u) => (seen.has(u.id) ? false : seen.add(u.id)));
  if (recipients.length === 0) throw ApiError.badRequest('Qabul qiluvchilar topilmadi');

  // Bildirishnomalarni yaratamiz
  await prisma.notification.createMany({
    data: recipients.map((r) => ({
      userId: r.id,
      senderId: req.user.id,
      title: data.title,
      body: data.body,
      emailSent: !!data.sendEmail,
    })),
  });

  // Email (best-effort; mock rejimda konsolga log)
  let emailInfo = null;
  if (data.sendEmail) {
    const results = await Promise.all(
      recipients.map((r) => sendMail({ to: r.email, subject: data.title, text: data.body }))
    );
    emailInfo = {
      attempted: recipients.length,
      mocked: results.some((x) => x.mocked),
      failed: results.filter((x) => !x.sent).length,
    };
  }

  res.status(201).json({
    success: true,
    message: `${recipients.length} ta foydalanuvchiga xabar yuborildi`,
    count: recipients.length,
    email: emailInfo,
  });
});

// GET /api/admin/notifications/audience — yuborish uchun qabul qiluvchilar ro'yxati
const audience = asyncHandler(async (req, res) => {
  const isAdmin = req.user.role === 'ADMIN';
  const courseWhere = isAdmin ? {} : { instructorId: req.user.id };

  const courses = await prisma.course.findMany({
    where: courseWhere,
    orderBy: { title: 'asc' },
    select: { id: true, title: true, _count: { select: { enrollments: true } } },
  });

  let users;
  if (isAdmin) {
    users = await prisma.user.findMany({
      where: { role: 'USER' },
      orderBy: { fullName: 'asc' },
      select: { id: true, fullName: true, email: true },
    });
  } else {
    // Ustozning o'z o'quvchilari (biriktirilgan kurslarga yozilganlar)
    const ids = courses.map((c) => c.id);
    const enr = ids.length
      ? await prisma.enrollment.findMany({
          where: { courseId: { in: ids } },
          select: { user: { select: { id: true, fullName: true, email: true } } },
        })
      : [];
    const map = new Map();
    for (const e of enr) map.set(e.user.id, e.user);
    users = [...map.values()].sort((a, b) => a.fullName.localeCompare(b.fullName));
  }

  res.json({ success: true, isAdmin, courses, users });
});

// GET /api/admin/notifications/sent — yuborilgan xabarlar tarixi (so'nggi 50)
const listSent = asyncHandler(async (req, res) => {
  const list = await prisma.notification.findMany({
    where: { senderId: req.user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { user: { select: { fullName: true, email: true } } },
  });
  res.json({ success: true, notifications: list });
});

// ---------- Foydalanuvchi tomoni (/me) ----------

// GET /api/me/notifications — mening bildirishnomalarim
const listMine = asyncHandler(async (req, res) => {
  const [list, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { sender: { select: { fullName: true, role: true } } },
    }),
    prisma.notification.count({ where: { userId: req.user.id, read: false } }),
  ]);
  res.json({ success: true, notifications: list, unread });
});

// GET /api/me/notifications/unread-count — o'qilmaganlar soni (navbar belgisi uchun)
const unreadCount = asyncHandler(async (req, res) => {
  const unread = await prisma.notification.count({
    where: { userId: req.user.id, read: false },
  });
  res.json({ success: true, unread });
});

// POST /api/me/notifications/:id/read — bitta xabarni o'qilgan deb belgilash
const markRead = asyncHandler(async (req, res) => {
  const result = await prisma.notification.updateMany({
    where: { id: req.params.id, userId: req.user.id },
    data: { read: true },
  });
  if (result.count === 0) throw ApiError.notFound('Xabar topilmadi');
  res.json({ success: true });
});

// POST /api/me/notifications/read-all — barchasini o'qilgan deb belgilash
const markAllRead = asyncHandler(async (req, res) => {
  await prisma.notification.updateMany({
    where: { userId: req.user.id, read: false },
    data: { read: true },
  });
  res.json({ success: true });
});

module.exports = {
  send, audience, listSent,
  listMine, unreadCount, markRead, markAllRead,
};
