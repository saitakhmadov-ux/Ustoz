-- Baza auditidan keyingi indekslar: tez-tez ishlatiladigan filtrlar uchun
-- (jadval to'liq skanerlanmasin). Ma'lumot o'zgarmaydi.

-- DropIndex: [userId] o'rniga [userId, createdAt] keladi (ro'yxat shu tartibda o'qiladi)
DROP INDEX "Notification_userId_idx";

-- CreateIndex
CREATE INDEX "Certificate_courseId_idx" ON "Certificate"("courseId");

-- CreateIndex
CREATE INDEX "Course_published_createdAt_idx" ON "Course"("published", "createdAt");

-- CreateIndex
CREATE INDEX "Enrollment_expiresAt_idx" ON "Enrollment"("expiresAt");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "User_progressPingOff_progressPingAt_idx" ON "User"("progressPingOff", "progressPingAt");
