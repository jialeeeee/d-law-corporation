import { NextResponse } from "next/server";

// ─── Feature 6 · Mock Q&A · Branch: feat/court-appearance ────────────────────
//
// TODO(owner): implement POST /api/mock-qa
//   Request : MockQARequest { statement, history[] }   (lib/types.ts)
//   Response: MockQATurn                               (lib/types.ts)
//   - Call chatJson<MockQATurn>() from "@/lib/agnes/client".
//   - Ground with rulesetToPrompt() from "@/lib/sct/ruleset".
//   - Simulate the Tribunal Magistrate's probing ("how do you know X?",
//     "where's your proof of Y?", "explain this invoice"), give constructive
//     feedback on the user's last answer, and loop. Carry the indicativeNote.

export async function POST() {
  return NextResponse.json(
    { error: "Not implemented", feature: "mock-qa", branch: "feat/court-appearance" },
    { status: 501 },
  );
}
