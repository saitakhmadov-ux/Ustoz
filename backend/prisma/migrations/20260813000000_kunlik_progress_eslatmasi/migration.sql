-- AlterTable
ALTER TABLE "User" ADD COLUMN     "progressPingAt" TIMESTAMP(3),
ADD COLUMN     "progressPingOff" BOOLEAN NOT NULL DEFAULT false;
