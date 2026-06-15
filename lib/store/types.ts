// D'Law — Hearing Prep · client-side domain model.
//
// This is the shape the workspace UI reads/writes. It is intentionally separate
// from the server contracts in lib/types.ts (EvidenceExtract / HearingScript /
// etc.) so the UI has one stable, display-oriented model. The store
// (lib/store/store.ts) persists this to localStorage today; swapping to the
// Supabase/Prisma backend later only touches the store, not the UI.

import type { HearingScript } from "@/lib/types";

export type CaseStatus = "Draft" | "Gathering evidence" | "Active prep" | "Filed";

export type ViewKey =
  | "dashboard"
  | "evidence"
  | "timeline"
  | "hearings"
  | "qa"
  | "export"
  | "settings";

/** Case header metadata — drives the top bar, dashboard hero, export cover. */
export interface CaseMeta {
  id: string;
  title: string;
  caseNo: string;
  tribunal: string;
  claimant: string;
  respondent: string;
  /** Display amount, e.g. "S$1,280.00". */
  amountStr: string;
  /** ISO datetime of the hearing (used for the live countdown). */
  hearingISO: string;
  /** Display date, e.g. "24 June 2026". */
  hearingDate: string;
  /** Display time, e.g. "10:00 AM". */
  hearingTime: string;
  room: string;
  status: CaseStatus;
  createdAt: string;
}

export type EvidenceType = "Chat" | "PDF" | "Image" | "Audio" | "Doc";

/** One exhibit. Carries both display fields and the raw extract for AI handoff. */
export interface EvidenceItem {
  id: string;
  /** Human label shown on the card. */
  name: string;
  /** Short file name, e.g. "Receipt.pdf". */
  short: string;
  type: EvidenceType;
  /** Material Symbols icon name. */
  icon: string;
  /** CSS var for the icon colour, e.g. "var(--teal)". */
  color: string;
  /** Size or duration, e.g. "84 KB" / "03:24". */
  meta: string;
  /** Display date, e.g. "12 May 2024". */
  date: string;
  /** ISO-ish date used for sorting (best effort). */
  dateISO?: string;
  /** Category chip, e.g. "Payment". */
  tag: string;
  /** "Why it matters" note. */
  note: string;

  // ── Raw extract (from /api/evidence or /api/transcribe) ──
  kind: "image" | "document" | "audio";
  summary?: string;
  extractedText?: string;
  timeline?: { date: string; description: string }[];
  amounts?: string[];
  names?: string[];
  needsTranslation?: boolean;
  relevanceLevel?: "relevant" | "uncertain" | "irrelevant";
  quality?: { sufficient: boolean; issues: string[]; recommendation?: string };
  processingNote?: string;
  /** User's include/exclude decision (the user has final say, agent.md §0.1). */
  included: boolean;
}

export interface TimelineItem {
  id: string;
  date: string;
  dateISO?: string;
  title: string;
  desc: string;
  tag: string;
  amount?: string;
  /** Linked evidence id, if any. */
  ev?: string;
  /** Dot colour CSS var. */
  dot: string;
}

export type QaStatus = "new" | "review" | "confident";

export interface QaItem {
  id: string;
  q: string;
  a: string;
  tip: string;
  status: QaStatus;
}

export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

export interface ExportOpt {
  id: string;
  label: string;
  desc: string;
  sel: boolean;
}

export interface FactGroup {
  label: string;
  items: string[];
}

export interface ScriptSection {
  id: string;
  tag: string;
  lines: string[];
}

/** Everything for one case. */
export interface CaseData {
  meta: CaseMeta;
  evidence: EvidenceItem[];
  timeline: TimelineItem[];
  qa: QaItem[];
  checklist: ChecklistItem[];
  exportOpts: ExportOpt[];
  factGroups: FactGroup[];
  scriptSections: ScriptSection[];
  scriptReviewed: boolean;
  /** Raw generated script (for export / regeneration), if produced via Agnes. */
  hearingScript?: HearingScript | null;
}

/** App-wide preferences (Settings). */
export interface Preferences {
  dark: boolean;
  reminders: boolean;
  language: string;
}

/** The whole persisted blob. */
export interface WorkspaceState {
  cases: CaseData[];
  activeCaseId: string;
  prefs: Preferences;
}
