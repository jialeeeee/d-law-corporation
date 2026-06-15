// Seed content for the Hearing Prep workspace. A brand-new workspace starts with
// a single blank case ready to fill in — no example/demo data. Real
// uploads/generation populate the derived parts (timeline, facts, script, Q&A).

import type {
  CaseData,
  ChecklistItem,
  ExportOpt,
} from "./types";

/** Default hearing-day checklist applied to every new case. */
export function defaultChecklist(): ChecklistItem[] {
  return [
    { id: "c1", label: "Print 3 copies of every piece of evidence", done: false },
    { id: "c2", label: "Arrange evidence in chronological order", done: false },
    { id: "c3", label: "Prepare a 2-minute opening statement", done: false },
    { id: "c4", label: "Review likely questions & rehearse answers", done: false },
    { id: "c5", label: "Confirm hearing date, time & room", done: false },
    { id: "c6", label: "Bring NRIC / photo identification", done: false },
    { id: "c7", label: "Note the exact amount claimed", done: false },
    { id: "c8", label: "Plan to arrive 30 minutes early", done: false },
  ];
}

/** Default export sections for every case. */
export function defaultExportOpts(): ExportOpt[] {
  return [
    { id: "x1", label: "Cover sheet & case summary", desc: "Parties, claim and key dates on one page", sel: true },
    { id: "x2", label: "Evidence index & list", desc: "Numbered list of all exhibits", sel: true },
    { id: "x3", label: "Annotated timeline", desc: "Chronology with linked evidence", sel: true },
    { id: "x4", label: "Hearing script", desc: "Your prepared opening and closing", sel: true },
    { id: "x5", label: "Q&A preparation sheet", desc: "Likely questions with your answers", sel: true },
    { id: "x6", label: "Key facts summary", desc: "The extracted key facts", sel: false },
    { id: "x7", label: "Confidence checklist", desc: "Your hearing-day tick list", sel: false },
  ];
}

function emptyCase(
  id: string,
  meta: Partial<CaseData["meta"]> & Pick<CaseData["meta"], "title" | "caseNo">,
): CaseData {
  return {
    meta: {
      id,
      tribunal: "Small Claims Tribunals, Singapore",
      claimant: "",
      respondent: "",
      amountStr: "S$0.00",
      hearingISO: "",
      hearingDate: "To be assigned",
      hearingTime: "",
      room: "To be assigned",
      status: "Draft",
      createdAt: new Date().toISOString(),
      ...meta,
    },
    evidence: [],
    timeline: [],
    qa: [],
    checklist: defaultChecklist(),
    exportOpts: defaultExportOpts(),
    factGroups: [],
    scriptSections: [],
    scriptReviewed: false,
  };
}

/** The initial set of cases for a brand-new workspace: one blank case to fill in. */
export function seedCases(): CaseData[] {
  const year = new Date().getFullYear();
  return [
    emptyCase("c-1", { title: "Untitled case", caseNo: `SCT 0001 / ${year}` }),
  ];
}

/** Build a fresh, empty case for the "Create a new case" flow. */
export function newCase(id: string, title: string, caseNo: string): CaseData {
  return emptyCase(id, { title, caseNo });
}
