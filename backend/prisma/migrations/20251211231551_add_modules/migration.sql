-- CreateTable
CREATE TABLE "modules" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "modules_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "modules_courseId_idx" ON "modules"("courseId");

-- AlterTable: Add moduleId to lessons
-- SQLite doesn't support adding columns with foreign keys directly, so we need to:
-- 1. Create new table with moduleId
-- 2. Copy data
-- 3. Drop old table
-- 4. Rename new table

-- Step 1: Create new lessons table with moduleId
CREATE TABLE "lessons_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courseId" TEXT NOT NULL,
    "moduleId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "videoUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "lessons_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "lessons_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "modules" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Step 2: Copy data from old table
INSERT INTO "lessons_new" SELECT 
    "id",
    "courseId",
    NULL as "moduleId",
    "title",
    "description",
    "order",
    "videoUrl",
    "createdAt",
    "updatedAt"
FROM "lessons";

-- Step 3: Drop old table
DROP TABLE "lessons";

-- Step 4: Rename new table
ALTER TABLE "lessons_new" RENAME TO "lessons";

-- CreateIndex
CREATE INDEX "lessons_courseId_idx" ON "lessons"("courseId");
CREATE INDEX "lessons_moduleId_idx" ON "lessons"("moduleId");

