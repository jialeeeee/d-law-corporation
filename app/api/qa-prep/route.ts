import { NextResponse } from "next/server";
import { chatJson } from "@/lib/agnes/client";
import { rulesetToPrompt, INDICATIVE_NOTE } from "@/lib/sct/ruleset";
import type {
  EvidenceExtract,
  Transcript,
  CaseEvidenceBundle,
} from "@/lib/types";

// Agnes generations are slow (~up to 90s). Use the Node runtime and give the
// function real headroom so the platform doesn't kill it before Agnes replies.
// Keep maxDuration ≥ AGNES_TIMEOUT_MS (lib/agnes/client.ts).
export const runtime = "nodejs";
export const maxDuration = 120;

// Generates a prepared batch of likely tribunal Q&A from the case evidence.
// The design's Q&A screen seeds its list from this endpoint. Modelled on
// app/api/mock-qa/route.ts conventions (USE_MOCK, bundle/evidence context,
// ruleset grounding, chatJson, INDICATIVE_NOTE).

/** One prepared question/answer/tip produced by Agnes. */
export interface QaPrepItem {
  question: string;
  answer: string;
  tip: string;
}

/** Shape returned by Agnes (parsed via chatJson). */
interface QaPrepModelResult {
  items: QaPrepItem[];
}

/** Final response shape for POST /api/qa-prep. */
export interface QaPrepResponse {
  items: QaPrepItem[];
  indicativeNote: string;
}

// Accepts either the CaseEvidenceBundle handoff from Track A (preferred)
// or raw evidence arrays for flexibility during development.
export interface QaPrepFromEvidenceRequest {
  /** Preferred: the bundle produced by Track A after all evidence is processed. */
  bundle?: CaseEvidenceBundle;
  /** Fallback: raw evidence extracts if bundle is not yet available. */
  evidence?: Array<EvidenceExtract | Transcript>;
}

const MOCK_ITEMS: QaPrepItem[] = [
  {
    question:
      "You say you paid $2,000 on 3 January 2026. What proof do you have that this payment reached the respondent?",
    answer:
      "I have a bank transfer receipt showing $2,000 transferred to ABC Pte Ltd on 3 January 2026, and I can produce the original bank statement.",
    tip: "Name the exact document and the date — point to your evidence, not your memory.",
  },
  {
    question: "What exactly did you agree the respondent would do for that amount?",
    answer:
      "We agreed in writing that ABC Pte Ltd would complete renovation works for $2,000. The signed contract sets out the scope.",
    tip: "Tie every claim back to the written agreement where one exists.",
  },
  {
    question: "How do you know the works were never carried out?",
    answer:
      "The contractor never attended on the scheduled start date of 10 January 2026, and my WhatsApp follow-up on 11 January went unanswered.",
    tip: "Give a date and the evidence that shows the absence of performance.",
  },
  {
    question: "What remedy are you asking the Tribunal to order?",
    answer:
      "A full refund of $2,000, being the contract price paid for works that were never performed.",
    tip: "State the precise amount and why you are entitled to it.",
  },
];

function buildEvidenceContext(
  evidence: Array<EvidenceExtract | Transcript>,
): string {
  return evidence
    .map((e, i) => {
      const kindLabel =
        e.kind === "audio" ? "Audio" : e.kind === "document" ? "Document" : "Image";
      const header = `[Evidence ${i + 1} — ${kindLabel}: ${e.sourceFile}]`;
      const timeline =
        e.timeline.length > 0
          ? `Timeline:\n${e.timeline.map((t) => `  - ${t.date}: ${t.description}`).join("\n")}`
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
      ? `MERGED TIMELINE:\n${bundle.timeline.map((t) => `  - ${t.date}: ${t.description}${t.sourceFile ? ` [${t.sourceFile}]` : ""}`).join("\n")}`
      : "MERGED TIMELINE: none identified";

  const entities =
    `Amounts: ${bundle.entities.amounts.join(", ") || "none"}\n` +
    `Names: ${bundle.entities.names.join(", ") || "none"}`;

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
    return NextResponse.json<QaPrepResponse>({
      items: MOCK_ITEMS,
      indicativeNote: INDICATIVE_NOTE,
    });
  }

  const body = (await req.json()) as QaPrepFromEvidenceRequest;
  const { bundle, evidence } = body;

  if (!bundle && (!evidence || evidence.length === 0)) {
    return NextResponse.json(
      { error: "Provide either 'bundle' (CaseEvidenceBundle from Track A) or 'evidence' array." },
      { status: 400 },
    );
  }

  const caseContext = bundle
    ? buildBundleContext(bundle)
    : buildEvidenceContext(evidence!);

  let result: QaPrepModelResult;
  try {
    result = await chatJson<QaPrepModelResult>({
      system: [
        rulesetToPrompt(),
        "You are helping a self-represented litigant at Singapore's Small Claims Tribunal " +
          "prepare for the questions they are likely to face at the hearing.",
        "Use the timelines, summaries, amounts, and names extracted from the evidence below as the SOLE source of facts.",
        "Do NOT invent facts, names, dates, or amounts that are not present in the evidence.",
        "Return valid JSON matching this exact shape:",
        '{ items: [{ question: string, answer: string, tip: string }] }',
        "Rules:",
        "- items: 8 to 10 questions a Tribunal Magistrate or the opposing party is likely to ask, ordered most-likely first.",
        "- question: A realistic, probing question — challenge dates, amounts, how the litigant knows a fact, or what evidence supports each claim.",
        "- answer: A concise model answer GROUNDED ONLY in the provided evidence. Reference the specific document/amount/date it relies on. Never invent facts.",
        "- tip: One short, practical line on how to handle that question well in the hearing.",
      ].join("\n"),
      user: `EVIDENCE FROM TRACK A:\n\n${caseContext}`,
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Q&A generation failed: ${(err as Error).message}` },
      { status: 502 },
    );
  }

  return NextResponse.json<QaPrepResponse>({
    items: result.items ?? [],
    indicativeNote: INDICATIVE_NOTE,
  });
}
