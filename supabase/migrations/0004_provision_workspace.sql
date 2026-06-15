-- Provision the Prisma-managed domain tables + Hearing Prep workspace columns.
--
-- WHY THIS EXISTS (not `prisma db push`): `profiles.id` has a cross-schema
-- foreign key into Supabase's `auth.users`. `prisma db push` introspects the DB,
-- trips over that FK (error P4002), and — even if forced via multiSchema — would
-- try to manage the entire `auth` schema and could DROP Supabase's auth tables.
-- So we provision the public domain tables with plain SQL instead, which never
-- touches the `auth` schema.
--
-- Fully IDEMPOTENT — safe to run any number of times. Apply via the Supabase SQL
-- Editor (paste + run), or the CLI:
--   npx prisma db execute --url "<your DIRECT_URL>" --file supabase/migrations/0004_provision_workspace.sql
--
-- (`profiles` is created by 0001; this only adds its workspace column.)

-- ── Base tables (mirror prisma/schema.prisma) ───────────────────────────────
CREATE TABLE IF NOT EXISTS "Case" (
  "id"             TEXT NOT NULL,
  "userId"         TEXT,
  "title"          TEXT,
  "status"         TEXT NOT NULL DEFAULT 'draft',
  "caseNo"         TEXT,
  "tribunal"       TEXT,
  "claimant"       TEXT,
  "respondent"     TEXT,
  "amountStr"      TEXT,
  "hearingISO"     TEXT,
  "hearingDate"    TEXT,
  "hearingTime"    TEXT,
  "room"           TEXT,
  "statement"      TEXT,
  "hearingScript"  JSONB,
  "evidenceItems"  JSONB,
  "timeline"       JSONB,
  "qa"             JSONB,
  "checklist"      JSONB,
  "exportOpts"     JSONB,
  "factGroups"     JSONB,
  "scriptSections" JSONB,
  "scriptReviewed" BOOLEAN NOT NULL DEFAULT false,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Case_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "MaterialFact" (
  "id"             TEXT NOT NULL,
  "caseId"         TEXT NOT NULL,
  "statement"      TEXT NOT NULL,
  "sourceQuote"    TEXT,
  "evidenceLinked" BOOLEAN NOT NULL DEFAULT false,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MaterialFact_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Evidence" (
  "id"             TEXT NOT NULL,
  "caseId"         TEXT NOT NULL,
  "kind"           TEXT NOT NULL,
  "sourceFile"     TEXT NOT NULL,
  "extract"        JSONB,
  "evidenceLinked" BOOLEAN NOT NULL DEFAULT false,
  "factId"         TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Evidence_pkey" PRIMARY KEY ("id")
);

-- ── Top up columns in case the tables pre-existed without them ───────────────
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "prefs" JSONB;

ALTER TABLE "Case" ADD COLUMN IF NOT EXISTS "caseNo" TEXT;
ALTER TABLE "Case" ADD COLUMN IF NOT EXISTS "tribunal" TEXT;
ALTER TABLE "Case" ADD COLUMN IF NOT EXISTS "claimant" TEXT;
ALTER TABLE "Case" ADD COLUMN IF NOT EXISTS "respondent" TEXT;
ALTER TABLE "Case" ADD COLUMN IF NOT EXISTS "amountStr" TEXT;
ALTER TABLE "Case" ADD COLUMN IF NOT EXISTS "hearingISO" TEXT;
ALTER TABLE "Case" ADD COLUMN IF NOT EXISTS "hearingDate" TEXT;
ALTER TABLE "Case" ADD COLUMN IF NOT EXISTS "hearingTime" TEXT;
ALTER TABLE "Case" ADD COLUMN IF NOT EXISTS "room" TEXT;
ALTER TABLE "Case" ADD COLUMN IF NOT EXISTS "evidenceItems" JSONB;
ALTER TABLE "Case" ADD COLUMN IF NOT EXISTS "timeline" JSONB;
ALTER TABLE "Case" ADD COLUMN IF NOT EXISTS "qa" JSONB;
ALTER TABLE "Case" ADD COLUMN IF NOT EXISTS "checklist" JSONB;
ALTER TABLE "Case" ADD COLUMN IF NOT EXISTS "exportOpts" JSONB;
ALTER TABLE "Case" ADD COLUMN IF NOT EXISTS "factGroups" JSONB;
ALTER TABLE "Case" ADD COLUMN IF NOT EXISTS "scriptSections" JSONB;
ALTER TABLE "Case" ADD COLUMN IF NOT EXISTS "scriptReviewed" BOOLEAN NOT NULL DEFAULT false;

-- ── Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "Case_userId_idx" ON "Case"("userId");
CREATE INDEX IF NOT EXISTS "Evidence_caseId_idx" ON "Evidence"("caseId");
CREATE INDEX IF NOT EXISTS "MaterialFact_caseId_idx" ON "MaterialFact"("caseId");

-- ── Foreign keys (ADD CONSTRAINT has no IF NOT EXISTS → guard each) ──────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Evidence_caseId_fkey') THEN
    ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_caseId_fkey"
      FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Evidence_factId_fkey') THEN
    ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_factId_fkey"
      FOREIGN KEY ("factId") REFERENCES "MaterialFact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MaterialFact_caseId_fkey') THEN
    ALTER TABLE "MaterialFact" ADD CONSTRAINT "MaterialFact_caseId_fkey"
      FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ── Row-Level Security: deny the PostgREST anon/auth roles; Prisma (table owner)
--    bypasses RLS, and ownership is enforced in app code by filtering on userId.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['Case', 'Evidence', 'MaterialFact'] LOOP
    IF to_regclass(format('public.%I', t)) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    END IF;
  END LOOP;
END $$;
