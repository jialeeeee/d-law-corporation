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
| **F6 — Hearing script + mock Q&A** | ✅ **ACTIVE** | `feat/court-appearance` |
| F1 — Eligibility checker | ⛔ deferred | — |
| F3 — Claim amount calculator | ⛔ deferred | — |
| F4 — e-Negotiation coach | ⛔ deferred | — |
| F5 — Consultation prep | ⛔ deferred | — |

**F2 now also includes** (added 2026-06-15): an **image transcript** (OCR / read-out of all
text in the image), a **timeline** of dated events, and a **summary** — see `EvidenceExtract`
in `lib/types.ts`.

The foundation (Next.js scaffold, Agnes client, ruleset, Prisma schema, shared types) is already
on `main`. The §0 non-negotiables below still apply in full. Deferred features keep their original
spec in Section 4 for if/when they return, but are out of scope for now.

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
  - audio transcription: **unconfirmed** — see Track 3 (F2).
- **Commands:** `npm run dev` · `npm run build` · `npm run db:push`
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
| **F6** `POST /api/hearing-script` | `chatJson()` | `agnes-2.0-flash` | Turns the witness statement into a `HearingScript` (opening, chronology tied to evidence, relief sought). |
| **F6** `POST /api/mock-qa` | `chatJson()` | `agnes-2.0-flash` | Simulates the Tribunal Magistrate's probing questions and gives feedback (`MockQATurn`). |

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
middleware.ts .............. session refresh + route protection (Lead owns)
prisma/schema.prisma ........ data model (Lead owns)
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
| B — Court appearance (F6) | `feat/court-appearance` | `app/api/hearing-script/*`, `app/api/mock-qa/*` | **Jia Le** |
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

### Auth — Lead (`feat/auth`)
**Owns:** `lib/supabase/*`, `middleware.ts`, `app/(auth)/*`, the `Case.userId` schema field.
Supabase Auth (email/password) via `@supabase/ssr`. `/login` + `/register` use server actions;
`middleware.ts` refreshes the session and redirects signed-out users away from `/wizard`.
**Donna** restyles the `(auth)` forms (they're intentionally minimal). Degrades gracefully when
`NEXT_PUBLIC_SUPABASE_*` aren't set yet, so other tracks aren't blocked.
**Data isolation:** Prisma bypasses Supabase RLS, so EVERY feature must filter `Case`/`Evidence`
by the signed-in `userId` (see §5). Get the current user server-side via
`getCurrentUser()` from `lib/supabase/server.ts`.

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

### TRACK B — Feature 6 (Court appearance: hearing script + mock Q&A)
**Branch:** `feat/court-appearance` · **Owns:** `app/api/hearing-script/*`, `app/api/mock-qa/*` + their UI.
**Spec:**
- `POST /api/hearing-script { statement } -> HearingScript` — plain-language opening, chronology
  walkthrough, each material fact tied to its evidence, relief sought. Derived ONLY from the user's
  witness statement; stress explaining every component (each invoice/defect).
- `POST /api/mock-qa { statement, history[] } -> MockQATurn` — simulate the Tribunal Magistrate's
  likely probing ("how do you know X?", "where's your proof of Y?", "explain this invoice"), and give
  feedback on the user's last answer. Iterative loop.
**Done when:** script derived only from the statement; mock Q&A loops with constructive feedback; all carry the not-advice note.

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

`Case` holds `statement String?` and `hearingScript Json?` (F6). `Evidence` has a
`kind: "image" | "audio"` discriminator and the structured extract in `extract Json` (F2).
`MaterialFact` links to `Evidence`. See `prisma/schema.prisma`. Minimise stored data (PDPA).

### 5a. Ownership / data isolation (auth)

`Case.userId` (nullable for now) holds the Supabase Auth user id. Because the app reads data via
Prisma — which connects with full DB privileges and **bypasses Supabase Row-Level Security** —
ownership is enforced in application code: **every read/write of a `Case` (and its `Evidence` /
`MaterialFact`) must filter by the authenticated `userId`.** Resolve the user server-side with
`getCurrentUser()` (`lib/supabase/server.ts`). Don't rely on RLS for the Prisma path.

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

1. **Foundation → `main` (DONE):** types, Agnes client incl. `transcribe()`, ruleset, schema.
2. Track A (`feat/evidence-audio`) and Track B (`feat/court-appearance`) build in parallel against
   the locked contracts (frontend can use mocks immediately).
3. P5 surfaces both features in `app/(web)`.
4. Small PRs into `main` throughout; integrate continuously, not at the end.
