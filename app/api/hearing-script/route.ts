import { NextResponse } from "next/server";

// ─── Feature 6 · Hearing script · Branch: feat/court-appearance ──────────────
//
// TODO(owner): implement POST /api/hearing-script
//   Request : HearingScriptRequest { statement }   (lib/types.ts)
//   Response: HearingScript                        (lib/types.ts)
//   - Call chatJson<HearingScript>() from "@/lib/agnes/client".
//   - Ground with rulesetToPrompt() from "@/lib/sct/ruleset".
//   - Derive the script ONLY from the user's witness statement — invent nothing.
//   - Plain-language opening, chronology with each material fact tied to its
//     evidence, and the relief sought. Carry the indicativeNote (not advice).

export async function POST() {
  return NextResponse.json(
    { error: "Not implemented", feature: "hearing-script", branch: "feat/court-appearance" },
    { status: 501 },
  );
}
