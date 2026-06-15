# Supabase setup (auth + database)

One-time setup for the Lead. After this, teammates only need the env vars
(shared out-of-band) and `npm install`.

## 1. Create the project
1. <https://supabase.com> → **New project**. Pick a region close to Singapore
   (e.g. `Southeast Asia (Singapore)`). Save the **database password** you set.
2. **Project Settings → API** — copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. **Project Settings → Database → Connection string → "URI"**:
   - **Transaction** pooler (port `6543`) → `DATABASE_URL` (append `?pgbouncer=true`)
   - **Session / Direct** (port `5432`) → `DIRECT_URL`

## 2. Fill `.env.local`
Copy `.env.example` → `.env.local` (git-ignored) and paste the four values above
plus `AGNES_KEY`. Never commit it; share with teammates out-of-band.

## 3. Create the tables
From the repo root, with `.env.local` in place:

```bash
npm run db:push                 # creates profiles, Case, Evidence, MaterialFact
```

Then run the two SQL files (auth glue + RLS) — either paste them into the
Supabase **SQL Editor**, or run from the CLI:

```bash
npx prisma db execute --schema prisma/schema.prisma --file supabase/migrations/0001_profiles_and_auth.sql
npx prisma db execute --schema prisma/schema.prisma --file supabase/migrations/0002_enable_rls.sql
```

What they do:
- `0001` — FK `profiles.id → auth.users(id)`, the `on_auth_user_created` trigger
  (auto-creates a profile row on signup, copying `full_name`), and owner-only RLS
  on `profiles`.
- `0002` — enables RLS on the Prisma tables so the public anon REST API can't read
  them. The app is unaffected (Prisma bypasses RLS); see `agent.md` §5a.

## 4. Auth provider settings (Supabase dashboard)
- **Authentication → Providers → Email**: enable. Decide **Confirm email**:
  - **ON** (recommended for prod): set **Authentication → URL Configuration → Site
    URL** to your deployed URL (and add `http://localhost:3000` to Redirect URLs).
    Then **Authentication → Email Templates → Confirm signup** — change the link to:
    `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`
    (this is what `app/auth/confirm/route.ts` handles).
  - **OFF** (fastest for the demo): signup returns a session immediately and the
    app routes straight to `/wizard`.

## 5. Verify
`npm run dev`, register an account, then check **Table editor → profiles** for the
new row, and **Authentication → Users** for the auth user.

## Tables created
| Table | Owner of definition | Notes |
| --- | --- | --- |
| `auth.users` | Supabase (built-in) | email/password identity |
| `public.profiles` | Prisma + SQL glue | 1:1 with auth user; trigger-populated; RLS on |
| `public.Case` | Prisma | `userId` = auth uid; RLS on (Prisma bypasses) |
| `public.Evidence` | Prisma | RLS on |
| `public.MaterialFact` | Prisma | RLS on |
