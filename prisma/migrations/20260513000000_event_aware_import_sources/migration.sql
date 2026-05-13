-- Allow more than one named division of the same category per event.
ALTER TYPE "DivisionGender" ADD VALUE IF NOT EXISTS 'MIXED';
ALTER TYPE "DivisionGender" ADD VALUE IF NOT EXISTS 'OTHER';

ALTER TABLE "Division" ADD COLUMN "slug" TEXT;

UPDATE "Division"
SET "slug" = lower(regexp_replace(regexp_replace(trim("name"), '[^a-zA-Z0-9]+', '-', 'g'), '(^-|-$)', '', 'g'));

UPDATE "Division"
SET "slug" = lower("gender")
WHERE "slug" IS NULL OR "slug" = '';

ALTER TABLE "Division" ALTER COLUMN "slug" SET NOT NULL;

DROP INDEX IF EXISTS "Division_eventId_gender_key";
CREATE UNIQUE INDEX "Division_eventId_slug_key" ON "Division"("eventId", "slug");

CREATE TABLE "ImportSource" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "divisionId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'USAU',
    "sourceUrl" TEXT NOT NULL,
    "sourceTitle" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastImportedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ImportSource_pkey" PRIMARY KEY ("id")
);

INSERT INTO "ImportSource" (
    "id",
    "eventId",
    "divisionId",
    "provider",
    "sourceUrl",
    "sourceTitle",
    "isActive",
    "lastImportedAt",
    "createdAt",
    "updatedAt"
)
SELECT
    'legacy-' || "id",
    "eventId",
    "id",
    'USAU',
    "usauUrl",
    "name",
    true,
    NULL,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Division"
WHERE "usauUrl" IS NOT NULL AND "usauUrl" <> ''
ON CONFLICT DO NOTHING;

CREATE UNIQUE INDEX "ImportSource_eventId_sourceUrl_key" ON "ImportSource"("eventId", "sourceUrl");
CREATE INDEX "ImportSource_eventId_divisionId_idx" ON "ImportSource"("eventId", "divisionId");

ALTER TABLE "ImportSource" ADD CONSTRAINT "ImportSource_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ImportSource" ADD CONSTRAINT "ImportSource_divisionId_fkey" FOREIGN KEY ("divisionId") REFERENCES "Division"("id") ON DELETE CASCADE ON UPDATE CASCADE;
