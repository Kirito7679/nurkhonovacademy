/*
  Warnings:

  - You are about to drop the column `expiresAt` on the `student_courses` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_student_courses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "purchaseRequestedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" DATETIME,
    "approvedBy" TEXT,
    "accessStartDate" DATETIME,
    "accessEndDate" DATETIME,
    CONSTRAINT "student_courses_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "student_courses_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_student_courses" ("approvedAt", "approvedBy", "courseId", "id", "purchaseRequestedAt", "status", "studentId") SELECT "approvedAt", "approvedBy", "courseId", "id", "purchaseRequestedAt", "status", "studentId" FROM "student_courses";
DROP TABLE "student_courses";
ALTER TABLE "new_student_courses" RENAME TO "student_courses";
CREATE INDEX "student_courses_studentId_idx" ON "student_courses"("studentId");
CREATE INDEX "student_courses_courseId_idx" ON "student_courses"("courseId");
CREATE UNIQUE INDEX "student_courses_studentId_courseId_key" ON "student_courses"("studentId", "courseId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
