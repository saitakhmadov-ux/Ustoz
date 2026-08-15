-- CreateEnum
CREATE TYPE "TelegramLinkPurpose" AS ENUM ('LINK', 'VERIFY');

-- AlterTable
ALTER TABLE "TelegramLink" ADD COLUMN     "purpose" "TelegramLinkPurpose" NOT NULL DEFAULT 'LINK',
ADD COLUMN     "pollHash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "TelegramLink_pollHash_key" ON "TelegramLink"("pollHash");
