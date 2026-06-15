-- Hearing-prep workspace columns (feat/hearing-prep-ui).
-- Adds the display-oriented case metadata + JSON workspace state used by the
-- Hearing Prep UI so the workspace persists to Postgres instead of localStorage.
-- Idempotent: every column uses ADD COLUMN IF NOT EXISTS, so it is safe to re-run.
--
-- Applied directly (not via `prisma db push`) because the introspection that
-- db push performs trips over the cross-schema profiles.id -> auth.users FK.
-- Run with:
--   prisma db execute --url "$DIRECT_URL" --file supabase/migrations/0003_hearing_prep_workspace.sql

-- Profile: app-wide UI preferences (theme, reminders, language).
alter table "profiles" add column if not exists "prefs" jsonb;

-- Case: hearing-prep header metadata (nullable — no fabricated defaults).
alter table "Case" add column if not exists "caseNo" text;
alter table "Case" add column if not exists "tribunal" text;
alter table "Case" add column if not exists "claimant" text;
alter table "Case" add column if not exists "respondent" text;
alter table "Case" add column if not exists "amountStr" text;
alter table "Case" add column if not exists "hearingISO" text;
alter table "Case" add column if not exists "hearingDate" text;
alter table "Case" add column if not exists "hearingTime" text;
alter table "Case" add column if not exists "room" text;

-- Case: workspace display state, persisted as JSON (owned by the client store).
alter table "Case" add column if not exists "evidenceItems" jsonb;
alter table "Case" add column if not exists "timeline" jsonb;
alter table "Case" add column if not exists "qa" jsonb;
alter table "Case" add column if not exists "checklist" jsonb;
alter table "Case" add column if not exists "exportOpts" jsonb;
alter table "Case" add column if not exists "factGroups" jsonb;
alter table "Case" add column if not exists "scriptSections" jsonb;
alter table "Case" add column if not exists "scriptReviewed" boolean not null default false;
