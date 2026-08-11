-- AlterTable
ALTER TABLE "Enrollment" ADD COLUMN     "expiryWarnedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "telegramSent" BOOLEAN NOT NULL DEFAULT false;
