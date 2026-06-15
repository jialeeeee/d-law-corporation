import { NextResponse } from "next/server";
import { chatJson } from "@/lib/agnes/client";
import { rulesetToPrompt, INDICATIVE_NOTE } from "@/lib/sct/ruleset";
import type {
  MockQATurn,
  MockQAExchange,
  EvidenceExtract,
  Transcript,
  CaseEvidenceBundle,
} from "@/lib/types";

// Agnes generations are slow (~up to 90s). Use the Node runtime and give the
// function real headroom so the platform doesn't kill it before Agnes replies.
// Keep maxDuration ≥ AGNES_TIMEOUT_MS (lib/agnes/client.ts).
export const runtime = "nodejs";
export const maxDuration = 120;

// Superset of MockQATurn — adds opponent questions and recommended answers.
export type MockQATurnExtended = MockQATurn & {
  /** Whether this question comes from the Tribunal Magistrate or the opposing party. */
  questionFrom: "magistrate" | "opponent";
  /** A suggested effective answer the litigant could give to this question. */
  recommendedAnswer: string;
};

// Accepts either the CaseEvidenceBundle handoff from Track A (preferred)
// or raw arrays for flexibility during development.
export interface MockQAFromEvidenceRequest {
  /** Preferred: the bundle produced by Track A after all evidence is processed. */
  bundle?: CaseEvidenceBundle;
  /** Fallback: raw evidence extracts if bundle is not yet available. */
  evidence?: Array<EvidenceExtract | Transcript>;
  history: MockQAExchange[];
}

const MOCK_TURN: MockQATurnExtended = {
  questionFrom: "magistrate",
  question:
    "You say you paid $2,000 on 3 January 2026. What proof do you have that this payment was made to the respondent?",
  feedbackOnLastAnswer: undefined,
  recommendedAnswer:
    "I have a bank transfer receipt showing a transfer of $2,000 to ABC Pte Ltd's account on 3 January 2026. I will produce the original bank statement as evidence.",
  tips: [
    "Always refer to a specific document — name the file or exhibit number.",
    "State when and how the payment was made (bank transfer, cash, cheque).",
    "If the receipt names the respondent, point that out clearly.",
  ],
  done: false,
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

  return `${timeline}\n\n${entities}`;
}

export async function POST(req: Request) {
  if (process.env.USE_MOCK === "1") {
    return NextResponse.json(MOCK_TURN);
  }

  const body = (await req.json()) as MockQAFromEvidenceRequest;
  const { bundle, evidence, history } = body;

  if (!bundle && (!evidence || evidence.length === 0)) {
    return NextResponse.json(
      { error: "Provide either 'bundle' (CaseEvidenceBundle from Track A) or 'evidence' array." },
      { status: 400 },
    );
  }

  const caseContext = bundle
    ? buildBundleContext(bundle)
    : buildEvidenceContext(evidence!);

  const historyContext =
    history.length > 0
      ? "\n\nPREVIOUS EXCHANGES:\n" +
        history
          .map(
            (e, i) =>
              `Q${i + 1} [${(e as unknown as { questionFrom?: string }).questionFrom ?? "magistrate"}]: ${e.question}\nA${i + 1}: ${e.answer}`,
          )
          .join("\n")
      : "";

  const lastAnswer = history.length > 0 ? history[history.length - 1].answer : null;

  // Alternate questioner: even turns → magistrate, odd turns → opponent.
  const nextQuestioner = history.length % 2 === 0 ? "magistrate" : "opponent";

  let result: MockQATurnExtended;
  try {
    result = await chatJson<MockQATurnExtended>({
      system: [
        rulesetToPrompt(),
        "You are running a mock hearing session to help a self-represented litigant prepare for Singapore's Small Claims Tribunal.",
        "The litigant's case is based entirely on the evidence extracted below — timelines, amounts, and names from their uploaded documents and audio.",
        `For this turn, you are playing the role of the ${nextQuestioner === "magistrate" ? "Tribunal Magistrate" : "opposing party (respondent)"}.`,
        "Base all questions ONLY on the evidence provided and prior exchanges. Do not invent new facts.",
        "Return valid JSON matching this exact shape:",
        '{ questionFrom: "magistrate"|"opponent", question: string, feedbackOnLastAnswer?: string, recommendedAnswer: string, tips: string[], done: boolean, indicativeNote: string }',
        "Rules:",
        `- questionFrom: "${nextQuestioner}"`,
        nextQuestioner === "magistrate"
          ? '- question: A probing question a Tribunal Magistrate would ask — challenge dates, amounts, how the litigant knows a fact, what evidence supports each claim. Examples: "How do you know X?", "Where is your proof of Y?", "Explain this amount."'
          : '- question: A challenging question the opposing party would raise — dispute the litigant\'s version of events, question the amount, or highlight gaps in their evidence.',
        "- feedbackOnLastAnswer: Constructive feedback on the litigant's last answer (clarity, use of evidence, completeness). Omit on the very first turn.",
        "- recommendedAnswer: A model answer the litigant could give — factual, concise, grounded in the evidence provided.",
        "- tips: 2–3 brief tips specific to handling this type of question well.",
        `- done: Set to true only after at least 6 exchanges AND all key facts from the evidence have been covered. Current exchange count: ${history.length}.`,
        "- indicativeNote: Copy exactly: " + JSON.stringify(INDICATIVE_NOTE),
      ].join("\n"),
      user:
        `EVIDENCE FROM TRACK A:\n\n${caseContext}${historyContext}` +
        (lastAnswer ? `\n\nLITIGANT'S LAST ANSWER:\n${lastAnswer}` : ""),
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Mock Q&A generation failed: ${(err as Error).message}` },
      { status: 502 },
    );
  }

  return NextResponse.json({ ...result, indicativeNote: INDICATIVE_NOTE });
}
