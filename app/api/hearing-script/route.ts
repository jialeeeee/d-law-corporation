import { NextResponse } from "next/server";
import { chatJson } from "@/lib/agnes/client";
import { rulesetToPrompt, INDICATIVE_NOTE } from "@/lib/sct/ruleset";
import type {
  HearingScript,
  HearingScriptRequest,
  EvidenceExtract,
  Transcript,
} from "@/lib/types";

// Extends the base request to accept optional evidence from Track A (F2).
// The UI compiles the litigant's statement + uploaded evidence extracts and
// sends them together so the script can reference actual evidence.
type RequestBody = HearingScriptRequest & {
  evidence?: Array<EvidenceExtract | Transcript>;
};

const MOCK_HEARING_SCRIPT: HearingScript = {
  opening:
    "My name is John Tan. On 3 January 2026 I engaged ABC Pte Ltd to carry out " +
    "renovation works at my home for $8,000. The works were never completed despite " +
    "full payment, and I am seeking a full refund.",
  chronology: [
    {
      heading: "Contract and Payment",
      content:
        "On 3 January 2026, I signed a contract with ABC Pte Ltd for renovation " +
        "works totalling $8,000. I transferred the full amount on the same day.",
      evidenceRefs: ["bank_transfer_jan2026.pdf"],
    },
    {
      heading: "Works Not Commenced",
      content:
        "The contractor was scheduled to begin on 10 January 2026 but did not " +
        "arrive. I contacted them by WhatsApp on 11 January and received no reply.",
      evidenceRefs: ["whatsapp_screenshot.png"],
    },
    {
      heading: "Failed Attempts to Resolve",
      content:
        "I sent a formal demand letter on 20 January 2026 requesting either " +
        "commencement of works or a full refund. No response was received.",
      evidenceRefs: ["demand_letter_jan2026.pdf"],
    },
  ],
  reliefSought:
    "I seek a full refund of $8,000 being the contract price paid for works " +
    "that were never performed.",
  indicativeNote: INDICATIVE_NOTE,
};

function buildEvidenceContext(evidence: Array<EvidenceExtract | Transcript>): string {
  return (
    "\n\nEVIDENCE SUBMITTED BY THE LITIGANT:\n" +
    evidence
      .map((e, i) => {
        const base =
          `[Evidence ${i + 1} — ${e.kind === "image" ? "Document/Image" : "Audio"}: ${e.sourceFile}]\n` +
          `Summary: ${e.summary}\n` +
          `Timeline: ${e.timeline.map((t) => `${t.date}: ${t.description}`).join("; ") || "none"}\n` +
          `Amounts mentioned: ${e.amounts.join(", ") || "none"}\n` +
          `Names mentioned: ${e.names.join(", ") || "none"}`;
        if (e.kind === "image") {
          return base + `\nExtracted text: ${e.extractedText}`;
        }
        return base + `\nTranscript: ${e.transcript}`;
      })
      .join("\n\n")
  );
}

export async function POST(req: Request) {
  if (process.env.USE_MOCK === "1") {
    return NextResponse.json(MOCK_HEARING_SCRIPT);
  }

  const body = (await req.json()) as RequestBody;
  const { statement, evidence } = body;

  if (!statement?.trim()) {
    return NextResponse.json(
      { error: "statement is required" },
      { status: 400 },
    );
  }

  const evidenceContext =
    evidence && evidence.length > 0 ? buildEvidenceContext(evidence) : "";

  const result = await chatJson<HearingScript>({
    system: [
      rulesetToPrompt(),
      "You are helping a self-represented litigant at Singapore's Small Claims Tribunal " +
        "structure their witness statement and uploaded evidence into a court-ready hearing script.",
      "Use ONLY the facts present in the statement and evidence provided. Do NOT invent facts, names, dates, or amounts.",
      "Return valid JSON matching this exact shape:",
      "{ opening: string, chronology: [{ heading: string, content: string, evidenceRefs?: string[] }], reliefSought: string, indicativeNote: string }",
      "Rules for each field:",
      "- opening: A short plain-language introduction (2–3 sentences) — who the litigant is, what happened, and what they are claiming.",
      "- chronology: Events in strict date order. Each entry must be tied to at least one piece of evidence where available. evidenceRefs must list the exact sourceFile names from the evidence provided.",
      "- reliefSought: The exact remedy requested (e.g. 'Refund of $X for Y'). Derive from amounts in the statement/evidence only.",
      "- indicativeNote: Copy exactly: " + JSON.stringify(INDICATIVE_NOTE),
    ].join("\n"),
    user: `WITNESS STATEMENT:\n${statement}${evidenceContext}`,
  });

  return NextResponse.json({ ...result, indicativeNote: INDICATIVE_NOTE });
}
