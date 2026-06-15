import { NextResponse } from "next/server";

// ─── Feature 2 · Evidence organiser (vision) · Branch: feat/evidence-audio ───
//
// TODO(owner): implement POST /api/evidence
//   Request : EvidenceRequest  { imageUrl?|imageBase64?, sourceFile }  (lib/types.ts)
//   Response: EvidenceExtract                                          (lib/types.ts)
//   - Call visionJson<EvidenceExtract>() from "@/lib/agnes/client".
//   - Ground the prompt with rulesetToPrompt() from "@/lib/sct/ruleset".
//   - Produce: extractedText (image transcript / OCR), summary, and a
//     timeline[] of dated events (TimelineEvent) — plus dates/amounts/names.
//   - Flag non-English material (needsTranslation) and keep a sourceQuote.
//   - Link the extract to its MaterialFact (evidenceLinked=true) where possible.
//
// Remove this stub once implemented. Keep the AGNES_KEY server-side only.

export async function POST() {
  return NextResponse.json(
    { error: "Not implemented", feature: "evidence", branch: "feat/evidence-audio" },
    { status: 501 },
  );
}
