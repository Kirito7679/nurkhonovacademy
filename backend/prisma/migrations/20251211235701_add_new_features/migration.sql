-- Add language field to users
ALTER TABLE "users" ADD COLUMN "language" TEXT NOT NULL DEFAULT 'ru';

-- Add metadata field to quiz_questions
ALTER TABLE "quiz_questions" ADD COLUMN "metadata" TEXT;

-- Create activity_logs table
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "details" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "activity_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "activity_logs_userId_idx" ON "activity_logs"("userId");
CREATE INDEX "activity_logs_action_idx" ON "activity_logs"("action");
CREATE INDEX "activity_logs_entityType_idx" ON "activity_logs"("entityType");
CREATE INDEX "activity_logs_createdAt_idx" ON "activity_logs"("createdAt");
CREATE INDEX "activity_logs_userId_createdAt_idx" ON "activity_logs"("userId", "createdAt");

-- Create flashcard_decks table
CREATE TABLE "flashcard_decks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courseId" TEXT,
    "lessonId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "createdBy" TEXT NOT NULL,
    "isPublic" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "flashcard_decks_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "flashcard_decks_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "flashcard_decks_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "flashcard_decks_courseId_idx" ON "flashcard_decks"("courseId");
CREATE INDEX "flashcard_decks_lessonId_idx" ON "flashcard_decks"("lessonId");
CREATE INDEX "flashcard_decks_createdBy_idx" ON "flashcard_decks"("createdBy");

-- Create flashcards table
CREATE TABLE "flashcards" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "deckId" TEXT NOT NULL,
    "front" TEXT NOT NULL,
    "back" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "flashcards_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "flashcard_decks" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "flashcards_deckId_idx" ON "flashcards"("deckId");

-- Create flashcard_progress table
CREATE TABLE "flashcard_progress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "deckId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL DEFAULT 'NEW',
    "lastReviewed" DATETIME,
    "nextReview" DATETIME,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "flashcard_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "flashcard_progress_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "flashcard_decks" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "flashcard_progress_userId_cardId_key" ON "flashcard_progress"("userId", "cardId");
CREATE INDEX "flashcard_progress_userId_idx" ON "flashcard_progress"("userId");
CREATE INDEX "flashcard_progress_deckId_idx" ON "flashcard_progress"("deckId");
CREATE INDEX "flashcard_progress_nextReview_idx" ON "flashcard_progress"("nextReview");

-- Create practice_exercises table
CREATE TABLE "practice_exercises" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lessonId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "solution" TEXT,
    "autoCheck" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "practice_exercises_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "practice_exercises_lessonId_idx" ON "practice_exercises"("lessonId");

-- Create practice_results table
CREATE TABLE "practice_results" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "exerciseId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "score" INTEGER,
    "feedback" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "reviewedBy" TEXT,
    "reviewedAt" DATETIME,
    "attemptNumber" INTEGER NOT NULL DEFAULT 1,
    "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "practice_results_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "practice_exercises" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "practice_results_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "practice_results_exerciseId_idx" ON "practice_results"("exerciseId");
CREATE INDEX "practice_results_studentId_idx" ON "practice_results"("studentId");
CREATE INDEX "practice_results_status_idx" ON "practice_results"("status");
CREATE INDEX "practice_results_submittedAt_idx" ON "practice_results"("submittedAt");

-- Create external_integrations table
CREATE TABLE "external_integrations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "courseId" TEXT,
    "lessonId" TEXT,
    "type" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "externalUrl" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "external_integrations_userId_idx" ON "external_integrations"("userId");
CREATE INDEX "external_integrations_courseId_idx" ON "external_integrations"("courseId");
CREATE INDEX "external_integrations_lessonId_idx" ON "external_integrations"("lessonId");
CREATE INDEX "external_integrations_type_idx" ON "external_integrations"("type");
