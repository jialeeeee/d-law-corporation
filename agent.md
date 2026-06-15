# Justifi — agent.md

**Mission:** help self-represented litigants at Singapore's Small Claims Tribunal (SCT)
turn their own account into a clear, court-ready case — eligibility, evidence, claim value,
negotiation, and appearance prep. Powered by **Agnes AI** (OpenAI-compatible), grounded in the
official State Courts *Guide to Small Claims*.

**Who this doc is for:** every teammate and every AI coding agent (Cline/Cursor/Claude Code).
Read Section 0 before writing a line. Work in your branch (Section 4), open small PRs into `main`.

---

## ⚠️ SCOPE — READ FIRST (updated 2026-06-15)

The team narrowed scope. **Only two features are active.** Do NOT build the deferred ones.

| Feature | Status | Track / branch |
| --- | --- | --- |
| **F2 — Evidence organiser + audio transcription** | ✅ **ACTIVE** | `feat/evidence-audio` |
| **F6 — Hearing script + mock Q&A** | ✅ **DONE** | `feat/court-appearance` |
| F1 — Eligibility checker | ⛔ deferred | — |
| F3 — Claim amount calculator | ⛔ deferred | — |
| F4 — e-Negotiation coach | ⛔ deferred | — |
| F5 — Consultation prep | ⛔ deferred | — |

**F2 now also includes** (added 2026-06-15): an **image transcript** (OCR / read-out of all
text in the image), a **timeline** of dated events, and a **summary** — see `EvidenceExtract`
in `lib/types.ts`.

The foundation (Next.js scaffold, Agnes client, ruleset, Prisma schema, shared types) **and a
Supabase Auth login/registration system** are on `main`. The §0 non-negotiables below still apply in
full. Deferred features keep their original spec in Section 4 for if/when they return, but are out of
scope for now.

> **Auth (added 2026-06-15):** users register / sign in before creating a case and uploading
> evidence. It's foundational infrastructure (Lead-owned — see §4 Auth track and §5a). Because
> Prisma bypasses Supabase RLS, **every feature must scope `Case`/`Evidence` queries by the
> signed-in `userId`.** Resolve it server-side with `getCurrentUser()` (`lib/supabase/server.ts`).

---

## 0. Non-negotiables — every branch follows these

1. **Boundary.** Justifi structures the user's OWN facts. It NEVER gives legal advice, predicts
   outcomes, or interprets the law. Outputs are **indicative only**; the official CJTS pre-filing
   assessment / the court is the authority. Every legal-substance response must carry an
   `indicativeNote` / not-advice line. (Reuse `INDICATIVE_NOTE` from `lib/sct/ruleset.ts`.)
2. **Agnes key is server-side only.** `process.env.AGNES_KEY` lives in route handlers. It must
   NEVER reach the browser. No keys in client components, logs, or commits. `lib/agnes/client.ts`
   imports `server-only` to enforce this.
3. **Ground in the ruleset, not the model's memory.** Any SCT-rule reasoning must pass
   `rulesetToPrompt()` from `lib/sct/ruleset.ts` into the prompt. Do not let the model recall SCT
   rules on its own.
4. **JSON-only + defensive parse.** Prompt for "valid JSON, no markdown" and parse with
   `parseJson()` (Agnes may not support `response_format`).
5. **Provenance.** Keep `sourceQuote` on extracted facts. Never invent facts, names, dates, amounts.
6. **Language rule.** Non-English documents/audio must be flagged as needing English translation
   (a hard SCT requirement) via `needsTranslation`.
7. **PDPA.** Narratives are sensitive. Minimise what you store, never log raw narratives or keys,
   prefer ephemeral processing. (Agnes is a third-party gateway — fine for build, flag for prod.)

---

## 1. Stack & key facts

- **Frontend/Backend:** Next.js (App Router) + TypeScript. **DB:** Prisma + Postgres (Supabase). **Deploy:** Vercel.
- **Auth:** Supabase Auth (email/password) via `@supabase/ssr`. Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (these two are browser-safe, unlike `AGNES_KEY`/`DATABASE_URL`).
- **Agnes (OpenAI-compatible):** base URL `https://apihub.agnes-ai.com/v1`
  - text/vision: `agnes-2.0-flash` · image: `agnes-image-2.1-flash` / `agnes-image-2.0-flash` · video: `agnes-video-v2.0`
  - audio transcription: **unconfirmed** — see Track A (F2).
- **Commands:** `npm run dev` · `npm run build` · `npm run db:push` (the db scripts are wrapped with `dotenv-cli` so they read `.env.local`, which Prisma's CLI otherwise ignores).
- **Env:** put secrets in `.env.local` (git-ignored; copy from `.env.example`). Needed to run against the real DB/Agnes — ask the Lead for the values.
- **Path alias:** `@/*` → repo root (already set in `tsconfig.json`).

---

## 1a. Agnes AI integration map (competition requirement)

**All model inference in Justifi goes through Agnes AI** — there is no other LLM provider. Every
call is constructed in `lib/agnes/client.ts`, which points the OpenAI-compatible SDK at
`AGNES_BASE_URL` (`https://apihub.agnes-ai.com/v1`) using the server-side `AGNES_KEY`. Helpers:
`chatJson()` (text), `visionJson()` (vision), `transcribe()` (audio). Use these — never call a
model directly.

| Surface | Agnes helper | Agnes model | What Agnes does |
| --- | --- | --- | --- |
| **F2** `POST /api/evidence` | `visionJson()` | `agnes-2.0-flash` (vision) | Reads the uploaded image and returns the image transcript (`extractedText`), summary, timeline of dated events, plus dates/amounts/names. |
| **F2** `POST /api/transcribe` | `transcribe()` → then `chatJson()` | Agnes `audio/transcriptions` (unconfirmed; swappable) → `agnes-2.0-flash` | Transcribes the audio, then structures it into `Transcript` (transcript, summary, timeline, language, needsTranslation, …). |
| **F6** `POST /api/hearing-script` | `chatJson()` | `agnes-2.0-flash` | Accepts witness statement + optional evidence extracts from Track A. Returns `HearingScript` (opening, chronology tied to source evidence files, relief sought). |
| **F6** `POST /api/mock-qa` | `chatJson()` | `agnes-2.0-flash` | Alternates between Tribunal Magistrate (even turns) and opposing party (odd turns). Returns `MockQATurnExtended`: question, questionFrom, feedbackOnLastAnswer, recommendedAnswer, tips[], done, indicativeNote. |

Notes for the demo / write-up:
- The Agnes model ids are centralised in `AGNES_MODELS` (`lib/agnes/client.ts`).
- Every SCT-grounded Agnes prompt also passes `rulesetToPrompt()` (§0.3) and asks for JSON-only,
  parsed defensively by `parseJson()` (§0.4).
- Audio is the one unconfirmed Agnes endpoint (§1). Track A verifies it in the Agnes dashboard;
  if missing, `setTranscribeProvider()` swaps the backend but the rest of the pipeline (and all F2
  structuring) still runs on Agnes.

---

## 2. Repo layout

```
lib/types.ts ................ shared contracts (Lead owns — change via PR)
lib/agnes/client.ts ......... chatJson / visionJson / transcribe (Lead owns)
lib/agnes/parseJson.ts ...... defensive JSON parse (Lead owns)
lib/sct/ruleset.ts .......... SCT grounding (Lead owns)
lib/db.ts ................... Prisma client singleton (Lead owns)
lib/supabase/*.ts .......... auth clients (browser/server) + session helpers (Lead owns)
lib/auth.ts ................. requireUser() + safe-redirect helpers (Lead owns)
middleware.ts .............. session refresh + route protection (Lead owns)
prisma/schema.prisma ........ data model incl. Profile (Lead owns)
supabase/migrations/*.sql ... profiles trigger + RLS (run after db:push — see supabase/SETUP.md)
app/auth/confirm ........... email-confirmation callback (Lead owns)
app/api/evidence ........... F2 (vision) — ACTIVE
app/api/transcribe ......... F2 (audio) — ACTIVE
app/api/hearing-script ..... F6 — ACTIVE
app/api/mock-qa ............ F6 — ACTIVE
app/(auth) ................. login + register pages (Lead; Donna styles forms)
app/(web) .................. UI that surfaces the active features (P5 wizard flow)
```

Rule of thumb: **work only inside your own folder.** The only shared files are
`lib/types.ts` and `prisma/schema.prisma`, both owned by the Lead.

---

## 3. Shared contracts

`lib/types.ts` is the single source of truth. When your feature needs a new type, the **Lead adds it
there via a tiny PR**, then you import it. Active types:

- F2: `EvidenceExtract`, `Transcript`, `MaterialFact`, `TimelineEvent`, `EvidenceRequest`, `TranscribeRequest`
- F6: `HearingScript`, `HearingScriptSection`, `MockQATurn`, `MockQAExchange`, `HearingScriptRequest`, `MockQARequest`

---

## 4. Work split — active tracks

**Team assignments — build only inside your track's folder** (suggested split; swap to match strengths):

| Track | Branch | Folder you own | Owner |
| --- | --- | --- | --- |
| A — Evidence + audio (F2) | `feat/evidence-audio` | `app/api/evidence/*`, `app/api/transcribe/*` | **Jing Yuan** → `/api/evidence` · **Damien** → `/api/transcribe` |
| B — Court appearance (F6) | `feat/court-appearance` | `app/api/hearing-script/*`, `app/api/mock-qa/*` | **Jia Le** ✅ DONE |
| P5 — Wizard UI | `feat/wizard` | `app/(web)/*` | **Donna** |
| Auth (login/register) | `feat/auth` | `lib/supabase/*`, `middleware.ts`, `app/(auth)/*` | **Jun Sheng** (Donna styles forms) |
| Foundation + merges | `main` | `lib/*`, `prisma/*` | **Jun Sheng** (Lead) |

Jing Yuan & Damien share the `feat/evidence-audio` branch, split by endpoint as shown; everyone
else owns their track solo. **Don't edit another track's folder** — need a change in `lib/types.ts`
or `prisma/schema.prisma`? Ping Jun Sheng for a quick PR.

### Foundation — Lead (DONE, on `main`)
**Owns:** `lib/types.ts`, `lib/agnes/*`, `lib/sct/ruleset.ts`, `lib/db.ts`, `prisma/schema.prisma`,
env, deploy, **merge coordination.** The Agnes client (incl. a swappable `transcribe()`), the locked
types, the ruleset and the schema are pushed to `main`. This unblocks everyone.

### Auth — Lead (`feat/auth`) — ✅ backend verified working
**Status:** the Supabase project is provisioned and the auth **backend is verified end-to-end**
(register → auto-profile trigger → login, plus wrong-password / non-existent / duplicate rejection,
all green). "Confirm email" is OFF in Supabase, so signup returns a session and routes to `/wizard`.
What's left is the **UI** (Donna) and wiring case creation to `userId`.
**Owns:** `lib/supabase/*`, `lib/auth.ts`, `middleware.ts`, `app/(auth)/*`, `app/auth/confirm/*`,
the `Profile` model + `Case.userId` schema field, `supabase/migrations/*`.
Supabase Auth (email/password) via `@supabase/ssr`. `/login` + `/register` are server actions
(`app/(auth)/actions.ts`) with server-side validation and a safe `?next=` redirect;
`signOut()` lives there too. `middleware.ts` refreshes the session and redirects signed-out users
away from `/wizard` (with `?next=`). `app/auth/confirm/route.ts` handles the email-confirmation
link (`verifyOtp`). On signup a DB trigger creates a `profiles` row (see §5a / `supabase/SETUP.md`).
**Donna** restyles the `(auth)` forms (intentionally minimal) — keep the field `name`s
(`email`, `password`, `fullName`, hidden `next`). Degrades gracefully when
`NEXT_PUBLIC_SUPABASE_*` aren't set, so other tracks aren't blocked.
**Data isolation:** Prisma bypasses Supabase RLS, so EVERY feature must filter `Case`/`Evidence`
by the signed-in `userId` (see §5a). Resolve + guard in one call with
`requireUser()` from `lib/auth.ts` (redirects to `/login` if signed out; returns the user whose
`.id` you filter by), or `getCurrentUser()` (`lib/supabase/server.ts`) when you want `null` instead.

### TRACK A — Feature 2 (Evidence organiser + audio transcription)
**Branch:** `feat/evidence-audio` · **Owns:** `app/api/evidence/*`, `app/api/transcribe/*`, uploads, fact↔evidence linking.
**FIRST TASK — verify the audio endpoint.** Check the Agnes dashboard for an OpenAI-compatible
`POST /v1/audio/transcriptions`. If present, the default `transcribe()` provider works. If absent,
call `setTranscribeProvider()` (Whisper / AssemblyAI / local) so the feature ships regardless.
**Spec:**
- `POST /api/evidence { imageUrl|imageBase64, sourceFile } -> EvidenceExtract`
  → vision extract with **image transcript** (`extractedText`), **summary**, **timeline[]** of
  dated events, plus `dates/amounts/names`, `needsTranslation`, `sourceQuote`.
- `POST /api/transcribe { audioUrl|audioBase64, sourceFile } -> Transcript`
  → run the raw transcript through `chatJson` to get `{ transcript, summary, timeline, language, needsTranslation, dates[], amounts[], names[], relevance }`.
- Organise: link each `EvidenceExtract`/`Transcript` to the matching `MaterialFact` (`evidenceLinked=true`).
- Flag non-English (translation required). Make the transcript downloadable — the SCT requires
  audio/video evidence to be submitted with a transcript.
**Done when:** image/audio → structured extract incl. transcript, summary, timeline; non-English flagged; transcript exportable; provider swappable.

### TRACK B — Feature 6 (Court appearance: hearing script + mock Q&A) ✅ DONE
**Branch:** `feat/court-appearance` · **Owner:** Jia Le · **Owns:** `app/api/hearing-script/*`, `app/api/mock-qa/*`.

- `POST /api/hearing-script { statement, evidence? } -> HearingScript` — accepts the witness
  statement plus optional `EvidenceExtract[]|Transcript[]` from Track A. Returns a plain-language
  opening, chronology with each event tied to its source evidence file (`evidenceRefs`), and exact
  relief sought. Derived only from provided data — nothing invented.
- `POST /api/mock-qa { statement, history[] } -> MockQATurnExtended` — alternates questioner:
  even turns = Tribunal Magistrate, odd turns = opposing party. Each turn returns:
  `question`, `questionFrom ("magistrate"|"opponent")`, `feedbackOnLastAnswer` (on prior answer),
  `recommendedAnswer` (suggested model answer for litigant), `tips[]`, `done` (true after ≥6
  exchanges), `indicativeNote`. `MockQATurnExtended` is a superset of `MockQATurn` — additive,
  non-breaking. Exported from `app/api/mock-qa/route.ts` for use by the UI.

Both endpoints: grounded with `rulesetToPrompt()`, call `chatJson()` on `agnes-2.0-flash`,
parse defensively, always force-attach `INDICATIVE_NOTE`. Support `USE_MOCK=1` fixture shortcut.
**Build:** ✅ `npm run build` passes with zero type errors.

### P5 — Wizard UI
**Owns:** `app/(web)/*`. Surface the two active features as steps/tabs; call the routes above.

---

## 4a. How to implement your endpoint (worked example)

Every API route follows the same shape: **parse the request → build a grounded prompt →
call an Agnes helper → return typed JSON.** Open your `route.ts` stub (it has a 501 + a TODO
listing the exact request/response types) and replace it using this pattern.

Worked example — `app/api/hearing-script/route.ts` (Track B):

```ts
import { NextResponse } from "next/server";
import { chatJson } from "@/lib/agnes/client";
import { rulesetToPrompt, INDICATIVE_NOTE } from "@/lib/sct/ruleset";
import type { HearingScript, HearingScriptRequest } from "@/lib/types";

export async function POST(req: Request) {
  // 1) Parse + validate the request (shape is in lib/types.ts).
  const { statement } = (await req.json()) as HearingScriptRequest;
  if (!statement?.trim()) {
    return NextResponse.json({ error: "statement is required" }, { status: 400 });
  }

  // 2) Build a grounded, JSON-only prompt. ALWAYS include rulesetToPrompt() (§0.3).
  const result = await chatJson<HearingScript>({
    system: [
      rulesetToPrompt(),
      "Help the litigant structure their OWN witness statement into a hearing script.",
      "Use ONLY facts present in the statement; invent nothing (§0.5).",
      "Return JSON: { opening, chronology:[{ heading, content, evidenceRefs? }], reliefSought, indicativeNote }",
    ].join("\n"),
    user: statement,
  });

  // 3) Return typed JSON; always attach the not-advice line (§0.1).
  return NextResponse.json({ ...result, indicativeNote: INDICATIVE_NOTE });
}
```

- **Track A (evidence)** is the same shape but uses `visionJson({ prompt, imageUrl })`, and
  `transcribe()` first for audio. See the TODO in each stub.
- **Mock + real (DoD §7).** To develop without burning Agnes calls, short-circuit with a fixture
  when a flag is set, e.g. at the top of the handler:
  ```ts
  if (process.env.USE_MOCK === "1") return NextResponse.json(MOCK_HEARING_SCRIPT);
  ```
  Demo with `USE_MOCK=1` for the mock and unset for the real Agnes call.

**Test it locally** — run `npm run dev`, then in a second terminal:

```powershell
# PowerShell (Windows)
Invoke-RestMethod -Uri http://localhost:3000/api/hearing-script -Method Post `
  -ContentType 'application/json' `
  -Body '{"statement":"On 3 Jan 2026 I paid ABC Pte Ltd $2,000 for repairs never completed."}'
```
```bash
# Git Bash / curl
curl -s -X POST http://localhost:3000/api/hearing-script \
  -H "Content-Type: application/json" \
  -d '{"statement":"On 3 Jan 2026 I paid ABC Pte Ltd $2,000 for repairs never completed."}'
```

Before opening a PR, run `npm run build` (it type-checks everything) and the §7 checklist.

---

<details>
<summary>Deferred feature specs (F1, F3, F4, F5) — out of scope, kept for reference</summary>

- **F1 Eligibility checker:** `POST /api/eligibility { narrative } -> EligibilityResult`. Dispute
  type → jurisdiction; value vs $20k/$30k; 2-year time bar; respondent in SG; flag exclusions
  (motor-vehicle damage, neighbour movable-property damage, claim-splitting). Indicative only.
- **F3 Claim amount calculator:** `POST /api/claim-amount` — normal = sum(items); rescission =
  contract value; progress payment = entire contract value; `withinLimit` vs $20k/$30k; filing-fee tiers.
- **F4 e-Negotiation coach:** `POST /api/negotiation` — 5 rounds, accept/counter/hold suggestions,
  settlement → Consent Order. Never guarantees outcomes.
- **F5 Consultation prep:** `POST /api/consultation-prep` — pre-consultation checklist, interpreter
  languages, attire, what to expect.

If revived, the Lead re-adds the matching types to `lib/types.ts` and the JSON fields to `Case`.

</details>

---

## 5. Data model (Lead, via PR)

`Profile` (1:1 with the Supabase Auth user; `id` = auth uid) holds `email` / `full_name`, created
automatically by the `on_auth_user_created` trigger on signup. `Case` holds `statement String?`
and `hearingScript Json?` (F6) plus `userId` (= auth uid). `Evidence` has a
`kind: "image" | "audio"` discriminator and the structured extract in `extract Json` (F2).
`MaterialFact` links to `Evidence`. See `prisma/schema.prisma`. Tables are created with
`npm run db:push` + the two `supabase/migrations/*.sql` files (`supabase/SETUP.md`).
Minimise stored data (PDPA).

### 5a. Ownership / data isolation (auth)

`Case.userId` (nullable for now) holds the Supabase Auth user id. Because the app reads data via
Prisma — which connects with full DB privileges and **bypasses Supabase Row-Level Security** —
ownership is enforced in application code: **every read/write of a `Case` (and its `Evidence` /
`MaterialFact`) must filter by the authenticated `userId`.** Resolve + guard with
`requireUser()` (`lib/auth.ts`) and filter by the returned `user.id`. RLS is still *enabled* on
every `public` table (`supabase/migrations/0002_enable_rls.sql`) to block the public anon REST
API — that's defense in depth, not the primary control. Don't rely on RLS for the Prisma path.

---

## 6. Git workflow

**Everyone:** branch from `main`.
```
git clone <repo-url> && cd d-law-corporation
git checkout main && git pull
git checkout -b feat/evidence-audio      # or feat/court-appearance — your track
git push -u origin feat/evidence-audio
```
**Daily rhythm (all):**
```
git checkout main && git pull          # pull merged work each morning
git checkout feat/<yours> && git merge main
# work in small commits, then push and open a small PR
```
**Conflict rules:**
1. Work only inside your own folder.
2. Need a change in `lib/types.ts` or `prisma/schema.prisma`? Ping the Lead → tiny fast PR.
3. Small, frequent PRs beat one giant end-of-project merge.
4. Pull `main` daily so branches never drift.

---

## 7. PR / Definition of Done checklist

- [ ] Builds (`npm run build`) with no type errors.
- [ ] No Agnes key or secret in client code, logs, or commit.
- [ ] Legal-substance output carries an `indicativeNote` / not-advice line.
- [ ] SCT reasoning passes `rulesetToPrompt()` (not the model's own knowledge).
- [ ] New types added to `lib/types.ts` via the Lead.
- [ ] Works against a mock + a real Agnes call; demo path shown in the PR.
- [ ] Reviewed by 1 teammate before merge to `main`.

---

## 8. Build order

1. **Foundation → `main` (DONE):** types, Agnes client incl. `transcribe()`, ruleset, schema, and
   Supabase Auth (login/registration) with `Case.userId`. The Supabase DB is provisioned and the
   auth backend is verified working (tables/trigger/RLS live); the db scripts read `.env.local`.
2. Track A (`feat/evidence-audio`) and Track B (`feat/court-appearance`) build in parallel against
   the locked contracts (frontend can use mocks immediately), scoping data by the signed-in `userId`.
3. P5 surfaces both features in `app/(web)`, behind login.
4. Small PRs into `main` throughout; integrate continuously, not at the end.

> After pulling `main`, run `npm install` — `main` now includes the Supabase deps.
