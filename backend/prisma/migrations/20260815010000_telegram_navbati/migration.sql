-- CreateTable
CREATE TABLE "TelegramOutbox" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "extra" JSONB,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextTryAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelegramOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TelegramOutbox_nextTryAt_idx" ON "TelegramOutbox"("nextTryAt");
