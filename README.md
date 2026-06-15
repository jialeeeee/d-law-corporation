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

```bash
git clone https://github.com/jialeeeee/d-law-corporation.git
cd d-law-corporation
npm install                 # also runs `prisma generate`
cp .env.example .env.local  # then fill in the values (see below)
npm run dev                 # http://localhost:3000
```

### Environment (`.env.local`)

Copy `.env.example` and fill in:

| Variable | What | Notes |
| --- | --- | --- |
| `AGNES_KEY` | Agnes AI API key | **Server-side only.** Never expose to the browser. |
| `AGNES_BASE_URL` | Agnes base URL | Defaults to `https://apihub.agnes-ai.com/v1`. |
| `DATABASE_URL` | Supabase pooled connection (port 6543) | Used at runtime. |
| `DIRECT_URL` | Supabase direct connection (port 5432) | Used by `prisma db push`. |

`.env.local` is git-ignored — **never commit real secrets.**

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

## Contributing

Branch from `main`, keep PRs small, and run through the Definition of Done in `agent.md` §7 before
requesting review.
