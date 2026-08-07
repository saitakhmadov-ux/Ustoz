-- AlterTable
ALTER TABLE "Lesson" ADD COLUMN     "quizCooldownHours" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "quizDraw" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "quizPassPercent" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN     "quizTimePerQ" INTEGER NOT NULL DEFAULT 20;

-- AlterTable
ALTER TABLE "QuizQuestion" ADD COLUMN     "imageUrl" TEXT;

-- CreateTable
CREATE TABLE "QuizAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "correct" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuizAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuizAttempt_userId_lessonId_idx" ON "QuizAttempt"("userId", "lessonId");

-- AddForeignKey
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
