-- 1) Create Company table
CREATE TABLE IF NOT EXISTS "Company" (
  "id"              TEXT PRIMARY KEY,
  "name"            TEXT NOT NULL,
  "timezone"        TEXT NOT NULL DEFAULT 'UTC',
  "slackWebhookUrl" TEXT,
  "createdAt"       TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt"       TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 2) Add new columns to User if not present
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "companyId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP NOT NULL DEFAULT NOW();
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW();

-- 3) Backfill: create a Company for any user that had old fields populated
INSERT INTO "Company" ("id","name","timezone","slackWebhookUrl")
SELECT DISTINCT
  'cmp_' || u."id" AS id,
  COALESCE(u."companyName", 'Your Company') AS name,
  COALESCE(u."timezone", 'UTC') AS timezone,
  u."slackWebhookUrl"
FROM "User" u
LEFT JOIN "Company" c ON c."id" = 'cmp_' || u."id"
WHERE c."id" IS NULL
  AND (u."companyName" IS NOT NULL OR u."timezone" IS NOT NULL OR u."slackWebhookUrl" IS NOT NULL);

-- 4) Link users to their new company
UPDATE "User" u
SET "companyId" = 'cmp_' || u."id"
WHERE u."companyId" IS NULL
  AND (u."companyName" IS NOT NULL OR u."timezone" IS NOT NULL OR u."slackWebhookUrl" IS NOT NULL);

-- 5) Drop the old columns from User
ALTER TABLE "User" DROP COLUMN IF EXISTS "companyName";
ALTER TABLE "User" DROP COLUMN IF EXISTS "slackWebhookUrl";
ALTER TABLE "User" DROP COLUMN IF EXISTS "timezone";

-- 6) Add FK now that data is in place (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'User_companyId_fkey'
  ) THEN
    ALTER TABLE "User"
      ADD CONSTRAINT "User_companyId_fkey"
      FOREIGN KEY ("companyId") REFERENCES "Company"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
