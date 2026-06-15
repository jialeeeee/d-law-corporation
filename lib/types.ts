// Justifi — shared contracts (agent.md §3). The Lead owns this file; change it
// only via a small PR so every track builds against the same shapes.
//
// CURRENT SCOPE (updated 2026-06-15): only Feature 2 (Evidence organiser + audio
// transcription) and Feature 6 (Hearing script + mock Q&A) are active.
// Deferred: Eligibility (F1), Claim amount (F3), Negotiation (F4), Consultation
// prep (F5). Their contracts can be restored from agent.md / git history if revived.

/** A single material fact the litigant asserts, with optional grounding. */
export interface MaterialFact {
  id: string;
  statement: string;
  /** Verbatim quote from a source document/transcript supporting this fact. */
  sourceQuote?: string;
  /** True once at least one piece of evidence is linked to this fact. */
  evidenceLinked: boolean;
  /** IDs of Evidence (image extracts / transcripts) supporting this fact. */
  evidenceRefs: string[];
}

// ───────────────────────── Feature 2 — Evidence + audio ─────────────────────

export type EvidenceKind = "image" | "audio";

/** A dated event pulled from evidence, used to build the case chronology. */
export interface TimelineEvent {
  /** Date of the event. Keep the date text verbatim if it is ambiguous. */
  date: string;
  /** What happened on that date. */
  description: string;
  /** The evidence file this event came from (provenance). */
  sourceFile?: string;
}

/** Structured extract from an image/document (vision). */
export interface EvidenceExtract {
  sourceFile: string;
  kind: "image";
  /** Image transcript — all readable text in the image (OCR / read-out). */
  extractedText: string;
  /** Plain-language summary of what the evidence shows. */
  summary: string;
  /** Dated events identified in this evidence, for the case timeline. */
  timeline: TimelineEvent[];
  dates: string[];
  amounts: string[];
  names: string[];
  language: string;
  /** SCT requires English; non-English material must be flagged for translation. */
  needsTranslation: boolean;
  relevance: string;
  /** Verbatim text the extract is grounded in (provenance — agent.md §0.5). */
  sourceQuote?: string;
  /** id of the MaterialFact this evidence supports, if linked. */
  linkedFactId?: string;
  evidenceLinked: boolean;
}

/** Structured transcript derived from an audio file. */
export interface Transcript {
  sourceFile: string;
  kind: "audio";
  transcript: string;
  /** Plain-language summary of what the audio shows. */
  summary: string;
  /** Dated events identified in this audio, for the case timeline. */
  timeline: TimelineEvent[];
  language: string;
  needsTranslation: boolean;
  dates: string[];
  amounts: string[];
  names: string[];
  relevance: string;
  linkedFactId?: string;
  evidenceLinked: boolean;
}

/** Request body for POST /api/evidence (vision extract). */
export interface EvidenceRequest {
  imageUrl?: string;
  imageBase64?: string;
  sourceFile: string;
}

/** Request body for POST /api/transcribe. */
export interface TranscribeRequest {
  audioUrl?: string;
  audioBase64?: string;
  sourceFile: string;
}

// ─────────────────── Feature 6 — Hearing script + mock Q&A ───────────────────

export interface HearingScriptSection {
  heading: string;
  content: string;
  /** Evidence/fact references this section ties to (each fact → its evidence). */
  evidenceRefs?: string[];
}

export interface HearingScript {
  /** Plain-language opening statement. */
  opening: string;
  /** Chronological walkthrough; each material fact tied to its evidence. */
  chronology: HearingScriptSection[];
  /** The exact relief/remedy the litigant is asking the Tribunal for. */
  reliefSought: string;
  /** Not-legal-advice line (agent.md §0.1). */
  indicativeNote: string;
}

export interface MockQATurn {
  /** The Tribunal Magistrate's next probing question. */
  question: string;
  /** Constructive feedback on the user's previous answer (omitted on first turn). */
  feedbackOnLastAnswer?: string;
  tips: string[];
  /** True once the simulated session has covered the key areas. */
  done: boolean;
  indicativeNote: string;
}

/** One past exchange in the mock Q&A loop. */
export interface MockQAExchange {
  question: string;
  answer: string;
}

/** Request body for POST /api/hearing-script. */
export interface HearingScriptRequest {
  /** The litigant's own witness statement — the ONLY source for the script. */
  statement: string;
}

/** Request body for POST /api/mock-qa. */
export interface MockQARequest {
  statement: string;
  history: MockQAExchange[];
}
