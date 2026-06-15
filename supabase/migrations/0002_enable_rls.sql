-- Justifi — enable Row-Level Security on the Prisma-managed domain tables.
-- Run this AFTER `npm run db:push`. Idempotent and existence-checked.
--
-- Why: every table in the `public` schema is auto-exposed over Supabase's REST
-- API using the *public* anon key (which ships to the browser). Without RLS,
-- anyone could read every case via that REST path. We never use that path — the
-- app talks to these tables through Prisma, which connects as the table owner and
-- BYPASSES RLS — so enabling RLS with NO anon policy closes the hole while leaving
-- the app fully working. Ownership for the Prisma path is still enforced in app
-- code by filtering on userId (agent.md §5a).
do $$
declare
  t text;
begin
  foreach t in array array['Case', 'Evidence', 'MaterialFact'] loop
    if to_regclass(format('public.%I', t)) is not null then
      execute format('alter table public.%I enable row level security', t);
      -- No permissive policy is created on purpose: RLS-enabled + no policy means
      -- the anon/authenticated PostgREST roles are denied, while the owner role
      -- Prisma uses still has full access.
    end if;
  end loop;
end $$;
