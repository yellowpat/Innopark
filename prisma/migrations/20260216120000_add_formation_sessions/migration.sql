-- Create formation_sessions table
CREATE TABLE "formation_sessions" (
    "id" TEXT NOT NULL,
    "formationId" TEXT NOT NULL,
    "dates" TIMESTAMP(3)[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "formation_sessions_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "formation_sessions" ADD CONSTRAINT "formation_sessions_formationId_fkey"
  FOREIGN KEY ("formationId") REFERENCES "formations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate: create one session per existing formation that has dates
INSERT INTO "formation_sessions" ("id", "formationId", "dates", "createdAt")
SELECT gen_random_uuid()::text, "id", "dates", "createdAt" FROM "formations"
WHERE array_length("dates", 1) IS NOT NULL;

-- Also create a session for formations without dates (so enrollments can migrate)
INSERT INTO "formation_sessions" ("id", "formationId", "dates", "createdAt")
SELECT gen_random_uuid()::text, "id", '{}', "createdAt" FROM "formations"
WHERE array_length("dates", 1) IS NULL;

-- Add sessionId to enrollments, populate from session mapping
ALTER TABLE "formation_enrollments" ADD COLUMN "sessionId" TEXT;
UPDATE "formation_enrollments" fe SET "sessionId" = fs."id"
  FROM "formation_sessions" fs WHERE fe."formationId" = fs."formationId";
ALTER TABLE "formation_enrollments" ALTER COLUMN "sessionId" SET NOT NULL;

-- Drop old unique index, FK constraint and column, add new ones
DROP INDEX "formation_enrollments_formationId_userId_key";
ALTER TABLE "formation_enrollments" DROP CONSTRAINT "formation_enrollments_formationId_fkey";
ALTER TABLE "formation_enrollments" DROP COLUMN "formationId";
CREATE UNIQUE INDEX "formation_enrollments_sessionId_userId_key" ON "formation_enrollments"("sessionId", "userId");
ALTER TABLE "formation_enrollments" ADD CONSTRAINT "formation_enrollments_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "formation_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Drop dates from formations
ALTER TABLE "formations" DROP COLUMN "dates";
