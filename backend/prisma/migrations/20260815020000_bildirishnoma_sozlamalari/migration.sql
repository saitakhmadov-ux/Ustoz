-- AlterTable
ALTER TABLE "User" ADD COLUMN     "notifyOff" TEXT[] DEFAULT ARRAY[]::TEXT[];
