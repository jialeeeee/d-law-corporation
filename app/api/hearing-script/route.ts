import { NextResponse } from "next/server";
import { chatJson } from "@/lib/agnes/client";
import { rulesetToPrompt, INDICATIVE_NOTE } from "@/lib/sct/ruleset";
import type { HearingScript, EvidenceExtract, Transcript } from "@/lib/types";

// New request shape — takes Track A evidence output directly.
// statement is kept as an optional fallback if the UI wants to pass one.
export interface HearingScriptFromEvidenceRequest {
  evidence: Array<EvidenceExtract | Transcript>;
  statement?: string;
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

function buildEvidencePrompt(evidence: Array<EvidenceExtract | Transcript>): string {
  return evidence
    .map((e, i) => {
      const header =
        `[Evidence ${i + 1} — ${e.kind === "image" ? "Document/Image" : "Audio"}: ${e.sourceFile}]`;
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

      if (e.kind === "image") return base + `\nExtracted text: ${e.extractedText}`;
      return base + `\nTranscript: ${e.transcript}`;
    })
    .join("\n\n");
}

export async function POST(req: Request) {
  if (process.env.USE_MOCK === "1") {
    return NextResponse.json(MOCK_HEARING_SCRIPT);
  }

  const body = (await req.json()) as HearingScriptFromEvidenceRequest;
  const { evidence, statement } = body;

  if (!evidence || evidence.length === 0) {
    return NextResponse.json(
      { error: "evidence is required — pass the output from /api/evidence and/or /api/transcribe" },
      { status: 400 },
    );
  }

  const evidenceContext = buildEvidencePrompt(evidence);
  const statementContext = statement?.trim()
    ? `\n\nADDITIONAL STATEMENT FROM LITIGANT:\n${statement}`
    : "";

  const result = await chatJson<HearingScript>({
    system: [
      rulesetToPrompt(),
      "You are helping a self-represented litigant at Singapore's Small Claims Tribunal " +
        "prepare a court-ready hearing script from their uploaded evidence.",
      "The evidence below was processed by an AI evidence organiser — use the timelines, " +
        "summaries, amounts, and names extracted from it as the SOLE source of facts.",
      "Do NOT invent facts, names, dates, or amounts that are not present in the evidence.",
      "Return valid JSON matching this exact shape:",
      "{ opening: string, chronology: [{ heading: string, content: string, evidenceRefs?: string[] }], reliefSought: string, indicativeNote: string }",
      "Rules:",
      "- opening: 2–3 sentences — who the litigant is, what happened, what they are claiming.",
      "- chronology: Events in strict date order from the timelines. Each entry must reference the sourceFile it came from in evidenceRefs.",
      "- reliefSought: The exact remedy (e.g. 'Refund of $X for Y'). Derive only from amounts found in the evidence.",
      "- indicativeNote: Copy exactly: " + JSON.stringify(INDICATIVE_NOTE),
    ].join("\n"),
    user: `EVIDENCE FROM TRACK A:\n\n${evidenceContext}${statementContext}`,
  });

  return NextResponse.json({ ...result, indicativeNote: INDICATIVE_NOTE });
}
