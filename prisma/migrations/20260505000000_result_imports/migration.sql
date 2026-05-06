-- CreateEnum
CREATE TYPE "ResultSource" AS ENUM ('IMPORTED', 'MANUAL');

-- AlterTable
ALTER TABLE "Game"
ADD COLUMN "resultSource" "ResultSource" NOT NULL DEFAULT 'IMPORTED',
ADD COLUMN "manualOverride" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "sourceUrl" TEXT,
ADD COLUMN "sourceGameKey" TEXT,
ADD COLUMN "lastImportedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Game_eventId_divisionId_sourceGameKey_idx" ON "Game"("eventId", "divisionId", "sourceGameKey");
