// SCT grounding (agent.md §0.3). Any SCT-rule reasoning MUST pass this into the
// prompt — never let the model recall Small Claims Tribunal rules on its own.
//
// Scope note (2026-06-15): only the rules relevant to the active features —
// Feature 2 (Evidence + audio) and Feature 6 (Hearing script + mock Q&A) — are
// encoded here. Eligibility / claim-value / filing-fee / negotiation rules were
// dropped with their features; restore from git history if those return.

/** Bump when the encoded rules change so outputs can cite a version. */
export const RULESET_VERSION = "sct-guide-2024.1";

/** Reusable not-legal-advice line (agent.md §0.1). */
export const INDICATIVE_NOTE =
  "This output is generated to help you organise your own case for the Small " +
  "Claims Tribunals. It is information, not legal advice, and does not predict " +
  "any outcome. The official CJTS pre-filing assessment and the Tribunal are the " +
  "authority.";

export const SCT_RULESET = {
  version: RULESET_VERSION,
  overview:
    "The Small Claims Tribunals (SCT), part of the State Courts of Singapore, " +
    "hear specified small claims. Proceedings are informal and litigants usually " +
    "represent themselves.",
  evidence: {
    language:
      "All documents and spoken evidence must be in English. Non-English " +
      "material must be submitted with an English translation — flag anything " +
      "not in English as needing translation.",
    audioVideo:
      "Audio or video evidence must be submitted together with a written " +
      "transcript of its contents.",
    documents:
      "Bring originals of supporting documents and provide copies. Each piece " +
      "of evidence should be clearly linked to the fact it is meant to prove.",
    provenance:
      "Never invent facts, names, dates or amounts. Keep a verbatim source " +
      "quote for every extracted fact.",
  },
  hearing: {
    structure:
      "Present the claim as a clear chronology: a short plain-language opening, " +
      "the events in order, each material fact tied to the evidence that proves " +
      "it, and a clear statement of the exact relief sought.",
    components:
      "Be ready to explain every component of the claim individually — each " +
      "invoice, each item, each alleged defect — and how the amount was reached.",
    conduct:
      "Stay factual and concise. The Tribunal Magistrate may probe how you know " +
      "a fact or ask for proof of a specific item; answer by reference to evidence.",
  },
} as const;

/** Serialise the ruleset into a grounding block for system prompts. */
export function rulesetToPrompt(): string {
  const r = SCT_RULESET;
  return [
    `SCT GROUNDING (ruleset ${r.version}). Reason ONLY from these rules, not prior knowledge:`,
    `- Overview: ${r.overview}`,
    `- Evidence/language: ${r.evidence.language}`,
    `- Evidence/audio-video: ${r.evidence.audioVideo}`,
    `- Evidence/documents: ${r.evidence.documents}`,
    `- Evidence/provenance: ${r.evidence.provenance}`,
    `- Hearing/structure: ${r.hearing.structure}`,
    `- Hearing/components: ${r.hearing.components}`,
    `- Hearing/conduct: ${r.hearing.conduct}`,
  ].join("\n");
}
