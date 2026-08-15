-- CreateEnum
CREATE TYPE "CourseKind" AS ENUM ('STANDARD', 'TYPING');

-- CreateEnum
CREATE TYPE "TypingMode" AS ENUM ('KEYS', 'WORDS', 'TEXT', 'TIMED');

-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "kind" "CourseKind" NOT NULL DEFAULT 'STANDARD';

-- CreateTable
CREATE TABLE "TypingDrill" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "mode" "TypingMode" NOT NULL DEFAULT 'TEXT',
    "content" TEXT NOT NULL,
    "targetWpm" INTEGER NOT NULL DEFAULT 15,
    "targetAccuracy" INTEGER NOT NULL DEFAULT 95,
    "durationSec" INTEGER,
    "showKeyboard" BOOLEAN NOT NULL DEFAULT true,
    "hint" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TypingDrill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TypingAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lessonId" TEXT,
    "wpm" INTEGER NOT NULL,
    "accuracy" INTEGER NOT NULL,
    "chars" INTEGER NOT NULL,
    "errors" INTEGER NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "passed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TypingAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TypingDrill_lessonId_key" ON "TypingDrill"("lessonId");

-- CreateIndex
CREATE INDEX "TypingAttempt_userId_lessonId_idx" ON "TypingAttempt"("userId", "lessonId");

-- CreateIndex
CREATE INDEX "TypingAttempt_userId_createdAt_idx" ON "TypingAttempt"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "TypingDrill" ADD CONSTRAINT "TypingDrill_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TypingAttempt" ADD CONSTRAINT "TypingAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TypingAttempt" ADD CONSTRAINT "TypingAttempt_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
