import { NextResponse } from "next/server";
import { chatJson } from "@/lib/agnes/client";
import { rulesetToPrompt, INDICATIVE_NOTE } from "@/lib/sct/ruleset";
import type { MockQATurn, MockQARequest } from "@/lib/types";

// Superset of MockQATurn — adds opponent questions and recommended answers
// without breaking the base contract.
export type MockQATurnExtended = MockQATurn & {
  /** Whether this question comes from the Tribunal Magistrate or the opposing party. */
  questionFrom: "magistrate" | "opponent";
  /** A suggested effective answer the litigant could give to this question. */
  recommendedAnswer: string;
};

const MOCK_TURN: MockQATurnExtended = {
  questionFrom: "magistrate",
  question:
    "You say you paid $8,000 on 3 January 2026. What proof do you have that this payment was made to the respondent?",
  feedbackOnLastAnswer: undefined,
  recommendedAnswer:
    "I have a bank transfer receipt showing a transfer of $8,000 to ABC Pte Ltd's UEN account on 3 January 2026. I will produce the original bank statement as evidence.",
  tips: [
    "Always refer to a specific document — name the file or exhibit number.",
    "State when and how the payment was made (bank transfer, cash, cheque).",
    "If the receipt names the respondent, point that out clearly.",
  ],
  done: false,
  indicativeNote: INDICATIVE_NOTE,
};

export async function POST(req: Request) {
  if (process.env.USE_MOCK === "1") {
    return NextResponse.json(MOCK_TURN);
  }

  const body = (await req.json()) as MockQARequest;
  const { statement, history } = body;

  if (!statement?.trim()) {
    return NextResponse.json(
      { error: "statement is required" },
      { status: 400 },
    );
  }

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

  const lastAnswer =
    history.length > 0 ? history[history.length - 1].answer : null;

  // Alternate questioner: even-indexed turns (0, 2, 4…) → magistrate,
  // odd-indexed turns (1, 3, 5…) → opponent, so the litigant faces both.
  const nextQuestioner = history.length % 2 === 0 ? "magistrate" : "opponent";

  const result = await chatJson<MockQATurnExtended>({
    system: [
      rulesetToPrompt(),
      "You are running a mock hearing session to help a self-represented litigant prepare for Singapore's Small Claims Tribunal.",
      `For this turn, you are playing the role of the ${nextQuestioner === "magistrate" ? "Tribunal Magistrate" : "opposing party (respondent)"}.`,
      "Base all questions ONLY on the witness statement and the previous exchanges. Do not invent new facts.",
      "Return valid JSON matching this exact shape:",
      '{ questionFrom: "magistrate"|"opponent", question: string, feedbackOnLastAnswer?: string, recommendedAnswer: string, tips: string[], done: boolean, indicativeNote: string }',
      "Rules for each field:",
      `- questionFrom: "${nextQuestioner}"`,
      nextQuestioner === "magistrate"
        ? '- question: A probing question a Tribunal Magistrate would ask — challenge dates, amounts, how the litigant knows a fact, and what evidence supports each claim. Examples: "How do you know X?", "Where is your proof of Y?", "Explain this invoice."'
        : '- question: A challenging question the opposing party would raise — dispute the litigant\'s version of events, question the amount claimed, or highlight gaps in their evidence.',
      "- feedbackOnLastAnswer: Constructive feedback on the litigant's last answer (clarity, use of evidence, completeness). Omit on the very first turn.",
      "- recommendedAnswer: A model answer the litigant could give — factual, concise, and grounded in their evidence.",
      "- tips: 2–3 brief tips specific to handling this type of question well.",
      `- done: Set to true only after at least 6 exchanges AND all key facts (dates, amounts, evidence gaps) have been covered. Current exchange count: ${history.length}.`,
      "- indicativeNote: Copy exactly: " + JSON.stringify(INDICATIVE_NOTE),
    ].join("\n"),
    user:
      `WITNESS STATEMENT:\n${statement}${historyContext}` +
      (lastAnswer ? `\n\nLITIGANT'S LAST ANSWER:\n${lastAnswer}` : ""),
  });

  return NextResponse.json({ ...result, indicativeNote: INDICATIVE_NOTE });
}
