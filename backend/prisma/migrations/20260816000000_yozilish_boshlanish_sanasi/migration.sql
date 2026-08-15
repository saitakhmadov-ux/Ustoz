-- Yozilishning amaldagi foydalanish davri qachon boshlangani.
-- Mavjud yozilishlar uchun birinchi yozilish sanasi olinadi.
ALTER TABLE "Enrollment" ADD COLUMN "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "Enrollment" SET "startedAt" = "createdAt";
