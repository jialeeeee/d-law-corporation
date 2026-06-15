// Persistence + derivation for the Hearing Prep workspace.
//
// Today this is localStorage-backed (no auth/DB dependency — works immediately
// and survives reload). The whole surface is these pure functions, so wiring the
// Supabase/Prisma backend later is a localized change: reimplement load/save and
// the create/delete helpers to call the API, and the UI is untouched.

import type {
  CaseData,
  EvidenceItem,
  Preferences,
  TimelineItem,
  WorkspaceState,
  FactGroup,
} from "./types";
import { seedCases, newCase as buildNewCase } from "./demo";

const STORAGE_KEY = "dlaw.workspace.v2";

export const DEFAULT_PREFS: Preferences = {
  dark: false,
  reminders: true,
  language: "English",
};

function freshState(): WorkspaceState {
  const cases = seedCases();
  return { cases, activeCaseId: cases[0].meta.id, prefs: { ...DEFAULT_PREFS } };
}

/** Load the workspace from localStorage (or seed it on first run). SSR-safe. */
export function loadWorkspace(): WorkspaceState {
  if (typeof window === "undefined") return freshState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return freshState();
    const parsed = JSON.parse(raw) as Partial<WorkspaceState>;
    if (!parsed.cases || parsed.cases.length === 0) return freshState();
    return {
      cases: parsed.cases,
      activeCaseId: parsed.activeCaseId ?? parsed.cases[0].meta.id,
      prefs: { ...DEFAULT_PREFS, ...(parsed.prefs ?? {}) },
    };
  } catch {
    return freshState();
  }
}

/** Persist the workspace. No-op on the server. */
export function saveWorkspace(state: WorkspaceState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Quota / private-mode — fail quietly; the session still works in memory.
  }
}

export function genId(prefix = "id"): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Next sequential case number, e.g. "SCT 0001 / 2026". */
export function nextCaseNo(cases: CaseData[]): string {
  const year = new Date().getFullYear();
  const n = (cases.length + 1).toString().padStart(4, "0");
  return `SCT ${n} / ${year}`;
}

export function createCase(state: WorkspaceState, title: string): WorkspaceState {
  const id = genId("case");
  const c = buildNewCase(id, title.trim() || "Untitled case", nextCaseNo(state.cases));
  return { ...state, cases: [...state.cases, c], activeCaseId: id };
}

export function deleteCase(state: WorkspaceState, id: string): WorkspaceState {
  const cases = state.cases.filter((c) => c.meta.id !== id);
  if (cases.length === 0) {
    // Never leave the workspace empty — reseed a fresh blank case.
    const seeded = seedCases();
    return { ...state, cases: seeded, activeCaseId: seeded[0].meta.id };
  }
  const activeCaseId =
    state.activeCaseId === id ? cases[0].meta.id : state.activeCaseId;
  return { ...state, cases, activeCaseId };
}

/** Replace one case (immutable update by id). */
export function updateCase(
  state: WorkspaceState,
  id: string,
  fn: (c: CaseData) => CaseData,
): WorkspaceState {
  return {
    ...state,
    cases: state.cases.map((c) => (c.meta.id === id ? fn(c) : c)),
  };
}

// ───────────────────────────── derivation helpers ───────────────────────────

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

/** Best-effort parse of human / ISO dates → epoch ms (Infinity if unknown). */
export function parseDate(s?: string): number {
  if (!s) return Number.POSITIVE_INFINITY;
  const iso = Date.parse(s);
  if (!Number.isNaN(iso)) return iso;
  // "12 May 2024" / "May 12, 2024"
  const m = s.toLowerCase().match(/(\d{1,2})?\s*([a-z]{3,})\s*(\d{1,2})?,?\s*(\d{4})/);
  if (m) {
    const month = MONTHS[m[2].slice(0, 3)];
    if (month !== undefined) {
      const day = Number(m[1] ?? m[3] ?? 1);
      const year = Number(m[4]);
      return new Date(year, month, day).getTime();
    }
  }
  return Number.POSITIVE_INFINITY;
}

const dotForTag = (tag: string): string => {
  const t = tag.toLowerCase();
  if (t.includes("payment")) return "var(--green)";
  if (t.includes("deliver")) return "var(--amber)";
  if (t.includes("demand") || t.includes("breach")) return "var(--rose)";
  if (t.includes("milestone") || t.includes("filed")) return "var(--navy)";
  return "var(--teal)";
};

/** Merge every included exhibit's dated events into one sorted case timeline. */
export function deriveTimeline(evidence: EvidenceItem[]): TimelineItem[] {
  const items: TimelineItem[] = [];
  for (const e of evidence) {
    if (!e.included || !e.timeline) continue;
    e.timeline.forEach((ev, i) => {
      if (!ev.date && !ev.description) return;
      items.push({
        id: `${e.id}-${i}`,
        date: ev.date || "Undated",
        dateISO: ev.date,
        title: ev.description.slice(0, 80),
        desc: ev.description,
        tag: e.tag,
        ev: e.id,
        dot: dotForTag(e.tag),
      });
    });
  }
  return items.sort((a, b) => parseDate(a.dateISO) - parseDate(b.dateISO));
}

/** Derive the dashboard "key facts" groups from included evidence. */
export function deriveFactGroups(evidence: EvidenceItem[]): FactGroup[] {
  const inc = evidence.filter((e) => e.included);
  if (inc.length === 0) return [];
  const amounts = uniq(inc.flatMap((e) => e.amounts ?? []));
  const names = uniq(inc.flatMap((e) => e.names ?? []));
  const dated = inc.filter((e) => (e.timeline?.length ?? 0) > 0).length;
  const groups: FactGroup[] = [];
  if (names.length) groups.push({ label: "Parties & names identified", items: names.slice(0, 4) });
  if (dated) groups.push({ label: "Timeline of events", items: [`${dated} file(s) contain dated events`] });
  if (amounts.length) groups.push({ label: "Payments & amounts", items: amounts.slice(0, 4) });
  groups.push({
    label: "Evidence collected",
    items: [`${inc.length} included exhibit(s)`],
  });
  return groups;
}

function uniq(xs: string[]): string[] {
  return Array.from(new Set(xs.map((x) => x.trim()).filter(Boolean)));
}

/** De-duplicated entities across included evidence (for the AI handoff bundle). */
export function deriveEntities(evidence: EvidenceItem[]) {
  const inc = evidence.filter((e) => e.included);
  return {
    dates: uniq(inc.flatMap((e) => (e.timeline ?? []).map((t) => t.date))),
    amounts: uniq(inc.flatMap((e) => e.amounts ?? [])),
    names: uniq(inc.flatMap((e) => e.names ?? [])),
  };
}

// ───────────────────────────── readiness score ──────────────────────────────

/** Live readiness score per the design's formula (0–100). */
export function readiness(c: CaseData): {
  score: number;
  evidence: number;
  checklist: number;
  qa: number;
  script: number;
} {
  const evidenceCount = c.evidence.filter((e) => e.included).length;
  const evidence = Math.min(evidenceCount, 6) / 6;
  const checklist = c.checklist.length
    ? c.checklist.filter((x) => x.done).length / c.checklist.length
    : 0;
  const qa = c.qa.length
    ? c.qa.filter((q) => q.status === "confident").length / c.qa.length
    : 0;
  const script = c.scriptReviewed ? 1 : 0;
  const score = Math.round(
    (evidence * 0.25 + checklist * 0.3 + qa * 0.25 + script * 0.2) * 100,
  );
  return {
    score,
    evidence: Math.round(evidence * 100),
    checklist: Math.round(checklist * 100),
    qa: Math.round(qa * 100),
    script: Math.round(script * 100),
  };
}
