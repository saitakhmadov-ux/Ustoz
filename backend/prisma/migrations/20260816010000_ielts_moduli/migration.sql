-- CreateEnum
CREATE TYPE "IeltsTaskType" AS ENUM ('ACADEMIC_T1', 'GENERAL_T1', 'TASK2', 'TYPING', 'VOCAB');

-- CreateEnum
CREATE TYPE "IeltsVisual" AS ENUM ('NONE', 'LINE', 'BAR', 'PIE', 'TABLE', 'PROCESS', 'MAP');

-- CreateTable
CREATE TABLE "IeltsTask" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "IeltsTaskType" NOT NULL,
    "subtype" TEXT,
    "level" TEXT,
    "title" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "visual" "IeltsVisual" NOT NULL DEFAULT 'NONE',
    "chartData" JSONB,
    "imageUrl" TEXT,
    "dataSummary" TEXT,
    "body" TEXT,
    "minWords" INTEGER,
    "durationSec" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IeltsTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IeltsAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "taskId" TEXT,
    "type" "IeltsTaskType" NOT NULL,
    "text" TEXT NOT NULL,
    "words" INTEGER NOT NULL DEFAULT 0,
    "chars" INTEGER NOT NULL DEFAULT 0,
    "wpm" INTEGER NOT NULL DEFAULT 0,
    "accuracy" INTEGER,
    "errors" INTEGER,
    "correctWords" INTEGER,
    "durationMs" INTEGER NOT NULL,
    "minWords" INTEGER,
    "metMinWords" BOOLEAN,
    "aiBand" DOUBLE PRECISION,
    "aiCriteria" JSONB,
    "aiFeedback" TEXT,
    "aiStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IeltsAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IeltsTask_code_key" ON "IeltsTask"("code");

-- CreateIndex
CREATE INDEX "IeltsTask_type_active_idx" ON "IeltsTask"("type", "active");

-- CreateIndex
CREATE INDEX "IeltsAttempt_userId_createdAt_idx" ON "IeltsAttempt"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "IeltsAttempt_taskId_idx" ON "IeltsAttempt"("taskId");

-- AddForeignKey
ALTER TABLE "IeltsAttempt" ADD CONSTRAINT "IeltsAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IeltsAttempt" ADD CONSTRAINT "IeltsAttempt_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "IeltsTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;
