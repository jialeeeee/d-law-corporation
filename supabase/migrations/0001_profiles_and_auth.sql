-- Justifi — profiles glue + auth trigger + RLS on profiles.
-- Run this AFTER `npm run db:push` (which creates public.profiles from the Prisma
-- schema). Idempotent: safe to run more than once. Apply via the Supabase SQL
-- editor, or: prisma db execute --schema prisma/schema.prisma --file <this file>.

-- 1) Link profiles.id to the Supabase Auth user, cascading deletes.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_id_fkey'
  ) then
    alter table public.profiles
      add constraint profiles_id_fkey
      foreign key (id) references auth.users (id) on delete cascade;
  end if;
end $$;

-- 2) Auto-create a profile row whenever a new auth user signs up.
--    SECURITY DEFINER so it can write to public.profiles; empty search_path and
--    fully-qualified names per Supabase's hardening guidance.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, created_at, updated_at)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    now(),
    now()
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3) RLS: a profile is readable/updatable only by its owner. (Prisma connects as
--    the table owner and BYPASSES RLS, so the app is unaffected — this only locks
--    down the public anon/authenticated PostgREST path. Defense in depth.)
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);
