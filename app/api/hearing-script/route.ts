import { NextResponse } from "next/server";
import { chatJson } from "@/lib/agnes/client";
import { rulesetToPrompt, INDICATIVE_NOTE } from "@/lib/sct/ruleset";
import type {
  HearingScript,
  EvidenceExtract,
  Transcript,
  CaseEvidenceBundle,
} from "@/lib/types";

// Accepts either the CaseEvidenceBundle handoff from Track A (preferred)
// or raw arrays for flexibility during development.
export interface HearingScriptFromEvidenceRequest {
  /** Preferred: the bundle produced by Track A after all evidence is processed. */
  bundle?: CaseEvidenceBundle;
  /** Fallback: raw evidence extracts if bundle is not yet available. */
  evidence?: Array<EvidenceExtract | Transcript>;
}

const MOCK_HEARING_SCRIPT: HearingScript = {
  opening:
    "My name is John Tan. On 3 January 2026 I engaged ABC Pte Ltd to carry out " +
    "renovation works at my home for $2,000. The works were never completed despite " +
    "full payment, and I am seeking a full refund.",
  chronology: [
    {
      heading: "Contract and Payment",
      content:
        "On 3 January 2026, I signed a contract with ABC Pte Ltd for renovation " +
        "works totalling $2,000. I transferred the full amount on the same day.",
      evidenceRefs: ["invoice.png"],
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
      evidenceRefs: ["demand_letter.pdf"],
    },
  ],
  reliefSought:
    "I seek a full refund of $2,000 being the contract price paid for works " +
    "that were never performed.",
  indicativeNote: INDICATIVE_NOTE,
};

function buildEvidenceContext(evidence: Array<EvidenceExtract | Transcript>): string {
  return evidence
    .map((e, i) => {
      const kindLabel =
        e.kind === "audio" ? "Audio" : e.kind === "document" ? "Document" : "Image";
      const header = `[Evidence ${i + 1} — ${kindLabel}: ${e.sourceFile}]`;
      const timeline =
        e.timeline.length > 0
          ? `Timeline of events:\n${e.timeline.map((t) => `  - ${t.date}: ${t.description}`).join("\n")}`
          : "Timeline: none identified";
      const base =
        `${header}\n` +
        `Summary: ${e.summary}\n` +
        `${timeline}\n` +
        `Amounts: ${e.amounts.join(", ") || "none"}\n` +
        `Names: ${e.names.join(", ") || "none"}`;

      if (e.kind === "audio") {
        return base + `\nTranscript: ${(e as Transcript).transcript}`;
      }
      return base + `\nExtracted text: ${(e as EvidenceExtract).extractedText}`;
    })
    .join("\n\n");
}

function buildBundleContext(bundle: CaseEvidenceBundle): string {
  const timeline =
    bundle.timeline.length > 0
      ? `MERGED TIMELINE (all evidence, chronological):\n${bundle.timeline.map((t) => `  - ${t.date}: ${t.description}${t.sourceFile ? ` [${t.sourceFile}]` : ""}`).join("\n")}`
      : "MERGED TIMELINE: none identified";

  const entities =
    `Amounts across all evidence: ${bundle.entities.amounts.join(", ") || "none"}\n` +
    `Names across all evidence: ${bundle.entities.names.join(", ") || "none"}`;

  const perFile = bundle.evidence
    .map(
      (e, i) =>
        `[Evidence ${i + 1} — ${e.kind === "document" ? "Document" : "Image"}: ${e.sourceFile}]\n` +
        `Summary: ${e.summary}\n` +
        `Extracted text: ${e.extractedText}`,
    )
    .join("\n\n");

  return `${timeline}\n\n${entities}\n\nPER-FILE DETAILS:\n${perFile}`;
}

export async function POST(req: Request) {
  if (process.env.USE_MOCK === "1") {
    return NextResponse.json(MOCK_HEARING_SCRIPT);
  }

  const body = (await req.json()) as HearingScriptFromEvidenceRequest;
  const { bundle, evidence } = body;

  if (!bundle && (!evidence || evidence.length === 0)) {
    return NextResponse.json(
      { error: "Provide either 'bundle' (CaseEvidenceBundle from Track A) or 'evidence' array." },
      { status: 400 },
    );
  }

  const context = bundle
    ? buildBundleContext(bundle)
    : buildEvidenceContext(evidence!);

  const result = await chatJson<HearingScript>({
    system: [
      rulesetToPrompt(),
      "You are helping a self-represented litigant at Singapore's Small Claims Tribunal " +
        "prepare a court-ready hearing script from their uploaded evidence.",
      "Use the timelines, summaries, amounts, and names extracted from the evidence as the SOLE source of facts.",
      "Do NOT invent facts, names, dates, or amounts that are not present in the evidence.",
      "Return valid JSON matching this exact shape:",
      "{ opening: string, chronology: [{ heading: string, content: string, evidenceRefs?: string[] }], reliefSought: string, indicativeNote: string }",
      "Rules:",
      "- opening: 2–3 sentences — who the litigant is, what happened, what they are claiming.",
      "- chronology: Events in strict date order from the timeline. Each entry must reference the sourceFile it came from in evidenceRefs.",
      "- reliefSought: The exact remedy (e.g. 'Refund of $X for Y'). Derive only from amounts found in the evidence.",
      "- indicativeNote: Copy exactly: " + JSON.stringify(INDICATIVE_NOTE),
    ].join("\n"),
    user: `EVIDENCE FROM TRACK A:\n\n${context}`,
  });

  return NextResponse.json({ ...result, indicativeNote: INDICATIVE_NOTE });
}
