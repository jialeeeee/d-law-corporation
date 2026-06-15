// Mapping between the Prisma `Case` row and the UI's display-oriented CaseData.
//
// The DB is the single source of truth (no localStorage, no seed/demo content).
// The hearing-prep header lives in real columns; the richer workspace arrays
// (evidence, timeline, Q&A, checklist, …) are persisted as JSON columns owned
// by the client store. Every field maps back to the user's own input — nothing
// here fabricates case content.

import { Prisma } from "@prisma/client";
import type { Case as CaseRow } from "@prisma/client";
import type { HearingScript } from "@/lib/types";
import { defaultChecklist, defaultExportOpts } from "./demo";
import type {
  CaseData,
  CaseStatus,
  ChecklistItem,
  EvidenceItem,
  ExportOpt,
  FactGroup,
  QaItem,
  ScriptSection,
  TimelineItem,
} from "./types";

/** Read a JSON column as a typed array (empty array when null/!array). */
function arr<T>(v: Prisma.JsonValue | null | undefined): T[] {
  return Array.isArray(v) ? (v as unknown as T[]) : [];
}

/** Prisma row → the UI CaseData the workspace renders. */
export function rowToCaseData(row: CaseRow): CaseData {
  const checklist = arr<ChecklistItem>(row.checklist);
  const exportOpts = arr<ExportOpt>(row.exportOpts);
  return {
    meta: {
      id: row.id,
      title: row.title ?? "Untitled case",
      caseNo: row.caseNo ?? "",
      tribunal: row.tribunal ?? "Small Claims Tribunals, Singapore",
      claimant: row.claimant ?? "",
      respondent: row.respondent ?? "",
      amountStr: row.amountStr ?? "S$0.00",
      hearingISO: row.hearingISO ?? "",
      hearingDate: row.hearingDate ?? "To be assigned",
      hearingTime: row.hearingTime ?? "",
      room: row.room ?? "To be assigned",
      status: (row.status as CaseStatus) ?? "Draft",
      createdAt: row.createdAt.toISOString(),
    },
    evidence: arr<EvidenceItem>(row.evidenceItems),
    timeline: arr<TimelineItem>(row.timeline),
    qa: arr<QaItem>(row.qa),
    // A brand-new case has no stored checklist/export yet — fall back to the
    // blank structural templates (guidance scaffolding, not case content).
    checklist: checklist.length ? checklist : defaultChecklist(),
    exportOpts: exportOpts.length ? exportOpts : defaultExportOpts(),
    factGroups: arr<FactGroup>(row.factGroups),
    scriptSections: arr<ScriptSection>(row.scriptSections),
    scriptReviewed: row.scriptReviewed,
    hearingScript: (row.hearingScript as unknown as HearingScript) ?? null,
  };
}

/**
 * CaseData → Prisma write payload (without `id`). Used for both create and
 * update; `statement` is intentionally omitted so the workspace never clobbers
 * the witness statement owned by the hearing-script feature.
 */
export function caseDataToRow(
  c: CaseData,
  userId: string | null,
): Prisma.CaseUncheckedCreateInput {
  const json = (v: unknown): Prisma.InputJsonValue =>
    v as unknown as Prisma.InputJsonValue;
  return {
    userId,
    title: c.meta.title,
    status: c.meta.status,
    caseNo: c.meta.caseNo || null,
    tribunal: c.meta.tribunal || null,
    claimant: c.meta.claimant || null,
    respondent: c.meta.respondent || null,
    amountStr: c.meta.amountStr || null,
    hearingISO: c.meta.hearingISO || null,
    hearingDate: c.meta.hearingDate || null,
    hearingTime: c.meta.hearingTime || null,
    room: c.meta.room || null,
    hearingScript: c.hearingScript ? json(c.hearingScript) : Prisma.JsonNull,
    evidenceItems: json(c.evidence),
    timeline: json(c.timeline),
    qa: json(c.qa),
    checklist: json(c.checklist),
    exportOpts: json(c.exportOpts),
    factGroups: json(c.factGroups),
    scriptSections: json(c.scriptSections),
    scriptReviewed: c.scriptReviewed,
  };
}
