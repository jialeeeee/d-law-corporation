# Justifi

Helps self-represented litigants at Singapore's **Small Claims Tribunal (SCT)** turn their own
account into a clear, court-ready case. Next.js (App Router) + TypeScript, Prisma + Postgres
(Supabase), deployed on Vercel, powered by **Agnes AI** (OpenAI-compatible).

> **Information only, not legal advice.** Outputs are indicative; the official CJTS pre-filing
> assessment and the Tribunal are the authority.

**Read [`agent.md`](agent.md) before writing any code** — it has the non-negotiables, the active
scope, the per-track specs, and the git workflow. AI coding agents should read it too.

## Active scope

Two features are in scope (the rest are deferred — see `agent.md`):

- **F2 — Evidence organiser + audio transcription** (`feat/evidence-audio`): image transcript,
  summary, timeline of dated events, fact↔evidence linking, non-English flagging, audio → transcript.
- **F6 — Hearing script + mock Q&A** (`feat/court-appearance`): witness statement → hearing script;
  iterative mock Tribunal Q&A.

## Getting started

**Prerequisites:** Node.js 20+ and npm (check with `node -v`). Git. That's it — no global installs.

```bash
git clone https://github.com/jialeeeee/d-law-corporation.git
cd d-law-corporation
npm install                 # also runs `prisma generate`
cp .env.example .env.local  # PowerShell: Copy-Item .env.example .env.local
npm run dev                 # http://localhost:3000
```

Then fill in `.env.local` (see below) and confirm it runs: open http://localhost:3000.

### Environment (`.env.local`)

Copy `.env.example` and fill in:

| Variable | What | Notes |
| --- | --- | --- |
| `AGNES_KEY` | Agnes AI API key | **Server-side only.** Never expose to the browser. |
| `AGNES_BASE_URL` | Agnes base URL | Defaults to `https://apihub.agnes-ai.com/v1`. |
| `DATABASE_URL` | Supabase pooled connection (port 6543) | Used at runtime. |
| `DIRECT_URL` | Supabase direct connection (port 5432) | Used by `prisma db push`. |

`.env.local` is git-ignored — **never commit real secrets.** Ask the Lead for the real
`AGNES_KEY` and Supabase URLs (shared out-of-band, not via git). The app builds and the dev
server starts without them; routes that call Agnes/DB only fail when you actually hit them.

### Database

```bash
npm run db:push     # push prisma/schema.prisma to your Postgres
npm run db:studio   # optional: browse data
```

You can build and run most of the app without a database; only routes that persist data need it.

## Scripts

| Script | Does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build (type-checks the whole project) |
| `npm run start` | Run the production build |
| `npm run db:push` | Apply the Prisma schema to the database |
| `npm run db:generate` | Regenerate the Prisma client |

## Project layout

```
app/                 Next.js App Router (pages + /api routes)
  api/evidence       F2 — vision extract        (stub: implement on feat/evidence-audio)
  api/transcribe     F2 — audio transcription   (stub: implement on feat/evidence-audio)
  api/hearing-script F6 — hearing script        (stub: implement on feat/court-appearance)
  api/mock-qa        F6 — mock Q&A              (stub: implement on feat/court-appearance)
  (wizard)/          P5 — UI surfacing the features
lib/types.ts         Shared contracts (Lead owns — change via PR)
lib/agnes/           Agnes client: chatJson / visionJson / transcribe + parseJson
lib/sct/ruleset.ts   SCT grounding — pass rulesetToPrompt() into every SCT prompt
lib/db.ts            Prisma client singleton
prisma/schema.prisma Data model (Lead owns — change via PR)
```

The API routes ship as **501 stubs** with TODO comments pointing at the contract to implement.
Pick up your track's stub and build it out. Work only inside your own folder; ping the Lead for any
change to `lib/types.ts` or `prisma/schema.prisma`.

## Pick up your track (groupmates start here)

1. **Read [`agent.md`](agent.md)** — at minimum the SCOPE banner, §0 non-negotiables, and §4 (the
   ownership table — put your name on a track).
2. **Branch from `main`** for your track:
   ```bash
   git checkout main && git pull
   git checkout -b feat/evidence-audio   # or feat/court-appearance / feat/wizard
   git push -u origin feat/evidence-audio
   ```
3. **Open your stub** (e.g. `app/api/evidence/route.ts`). It returns 501 with a TODO listing the
   exact request/response types to use. **Implement it following the worked example in `agent.md` §4a**
   (parse request → ground with `rulesetToPrompt()` → call an Agnes helper → return typed JSON).
4. **Test locally** with the curl/PowerShell snippets in `agent.md` §4a.
5. **Before a PR:** run `npm run build` (type-checks everything) and tick the Definition of Done in
   `agent.md` §7. Keep PRs small; get 1 teammate review before merging to `main`.

**Stay in your own folder.** The only shared files are `lib/types.ts` and `prisma/schema.prisma`
(Lead-owned) — need a change there? Ping the Lead for a quick PR. Pull `main` daily so branches
don't drift.
