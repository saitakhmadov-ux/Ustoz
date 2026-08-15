-- AlterTable
ALTER TABLE "Lesson" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "announcedAt" TIMESTAMP(3);

-- Mavjud darslar allaqachon o'quvchilarda bor — ular haqida xabar YUBORILMASIN.
-- Shuning uchun hammasini "xabar berilgan" deb belgilaymiz; vazifa faqat shu
-- migratsiyadan keyin qo'shilgan darslarni topadi.
UPDATE "Lesson" SET "announcedAt" = CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "Lesson_announcedAt_createdAt_idx" ON "Lesson"("announcedAt", "createdAt");
