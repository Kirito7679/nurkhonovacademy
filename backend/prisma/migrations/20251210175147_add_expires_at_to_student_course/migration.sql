-- AlterTable
ALTER TABLE "student_courses" ADD COLUMN "expiresAt" DATETIME;

-- CreateIndex
CREATE INDEX "student_courses_expiresAt_idx" ON "student_courses"("expiresAt");
