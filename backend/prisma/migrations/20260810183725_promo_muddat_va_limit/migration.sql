-- AlterTable
ALTER TABLE "PromoCode" ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "maxUses" INTEGER;
