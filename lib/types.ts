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

// "document" covers PDFs and Office/text docs whose text is extracted server-side
// (lib/evidence/extractText.ts) before being structured by Agnes. "image" goes
// straight to Agnes vision. "audio" stays on the transcription track (Damien).
export type EvidenceKind = "image" | "document" | "audio";

/**
 * Agnes's *suggestion* of how relevant a file is to a dispute. It is only a hint
 * — the user decides what to include (agent.md §0.1: never decide the case for
 * them). "irrelevant" files default to excluded but can be re-included.
 */
export type RelevanceLevel = "relevant" | "uncertain" | "irrelevant";

/** A dated event pulled from evidence, used to build the case chronology. */
export interface TimelineEvent {
  /** Date of the event. Keep the date text verbatim if it is ambiguous. */
  date: string;
  /** What happened on that date. */
  description: string;
  /** The evidence file this event came from (provenance). */
  sourceFile?: string;
}

/**
 * Whether the extracted evidence is clean/complete enough to rely on. Drives the
 * "your upload needs to be clearer" flag surfaced to the user (agent.md §0).
 */
export interface ExtractionQuality {
  /** True when the content is legible and complete enough to use as-is. */
  sufficient: boolean;
  /** Model's self-rated confidence in the extraction, 0–1. */
  confidence: number;
  /** Concrete problems found, e.g. "image is blurry", "PDF has no text layer". */
  issues: string[];
  /** What the user should do to fix it, e.g. "re-scan at higher resolution". */
  recommendation?: string;
}

/** Structured extract from an image or document. */
export interface EvidenceExtract {
  sourceFile: string;
  /** "image" → Agnes vision; "document" → server text-extract then Agnes. */
  kind: "image" | "document";
  /** Original MIME type of the upload (e.g. image/png, application/pdf). */
  mimeType?: string;
  /** Full transcript — all readable text in the file (OCR / text layer). */
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
  /** Plain-language note on how this relates to a dispute (or that it doesn't). */
  relevance: string;
  /** Agnes's suggested relevance level — a hint; the user decides inclusion. */
  relevanceLevel?: RelevanceLevel;
  /** Quality flag — about LEGIBILITY ONLY (raised when the text couldn't be read). */
  quality: ExtractionQuality;
  /** Non-blocking processing note (e.g. AI summary was temporarily unavailable). */
  processingNote?: string;
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
  /** Agnes's suggested relevance level — a hint; the user decides inclusion. */
  relevanceLevel?: RelevanceLevel;
  /** Non-blocking processing note (e.g. AI structuring was unavailable). */
  processingNote?: string;
  linkedFactId?: string;
  evidenceLinked: boolean;
}

/**
 * Request body for POST /api/evidence. Accepts any supported evidence file —
 * images (PNG/JPG/WebP), PDFs, Office docs (DOCX) and plain text. Provide the
 * bytes either as a base64 string or a fetchable URL.
 *
 * `imageUrl` / `imageBase64` are kept as aliases for backward compatibility;
 * `fileUrl` / `fileBase64` are preferred for non-image uploads.
 */
export interface EvidenceRequest {
  /** Preferred: base64-encoded file bytes (no data: prefix needed). */
  fileBase64?: string;
  /** Preferred: a fetchable URL to the file. */
  fileUrl?: string;
  /** Back-compat alias for fileBase64 (images). */
  imageBase64?: string;
  /** Back-compat alias for fileUrl (images). */
  imageUrl?: string;
  /** Original file name, e.g. "invoice-2026-01.pdf" — used for provenance. */
  sourceFile: string;
  /** MIME type of the upload; inferred from sourceFile when omitted. */
  mimeType?: string;
}

/** Request body for POST /api/transcribe. */
export interface TranscribeRequest {
  audioUrl?: string;
  audioBase64?: string;
  sourceFile: string;
}

/**
 * The handoff artifact from Feature 2 → Feature 6. After the user uploads all
 * their evidence, this bundles every extract plus one merged, chronologically
 * ordered timeline and de-duplicated entities. Track B (hearing script / mock
 * Q&A) consumes this as the structured source for building the case narrative.
 */
export interface CaseEvidenceBundle {
  /** ISO timestamp the bundle was generated. */
  generatedAt: string;
  /** Per-file structured extracts. */
  evidence: EvidenceExtract[];
  /** All timeline events across files, ordered earliest → latest. */
  timeline: TimelineEvent[];
  /** De-duplicated entities gathered across all evidence. */
  entities: {
    dates: string[];
    amounts: string[];
    names: string[];
  };
  /** Not-legal-advice line (agent.md §0.1). */
  indicativeNote: string;
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
