"use server";

// Server actions backing the Hearing Prep workspace. These replace the old
// localStorage layer: the database is now the single source of truth, scoped to
// the signed-in user. Everything degrades gracefully — if Supabase/Postgres is
// unreachable, load returns null (the provider keeps an in-memory blank case)
// and save is a best-effort no-op, so the UI never hard-crashes.

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/supabase/server";
import type { Preferences, WorkspaceState } from "./types";
import { rowToCaseData, caseDataToRow } from "./map";
import { blankCase } from "./demo";
import { DEFAULT_PREFS } from "./store";

/**
 * Load the current user's workspace from the database. Returns null when the DB
 * can't be reached so the caller can fall back to an in-memory blank case.
 * Guarantees at least one (blank) case exists — the "keep one blank case" rule.
 */
export async function loadWorkspaceAction(): Promise<WorkspaceState | null> {
  try {
    const user = await getCurrentUser();
    const userId = user?.id ?? null;

    const rows = await prisma.case.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });
    let cases = rows.map(rowToCaseData);

    // Never leave the workspace empty — seed a single blank case (no demo data).
    if (cases.length === 0) {
      const blank = blankCase();
      const created = await prisma.case.create({
        data: { ...caseDataToRow(blank, userId), id: blank.meta.id },
      });
      cases = [rowToCaseData(created)];
    }

    let prefs: Preferences = { ...DEFAULT_PREFS };
    if (userId) {
      const profile = await prisma.profile.findUnique({ where: { id: userId } });
      if (profile?.prefs) {
        prefs = { ...DEFAULT_PREFS, ...(profile.prefs as Partial<Preferences>) };
      }
    }

    return { cases, activeCaseId: cases[0].meta.id, prefs };
  } catch {
    return null;
  }
}

/**
 * Persist the whole workspace: upsert every case, delete any the user removed,
 * and store app-wide preferences on the profile. Best-effort and idempotent.
 */
export async function saveWorkspaceAction(state: WorkspaceState): Promise<void> {
  try {
    const user = await getCurrentUser();
    const userId = user?.id ?? null;

    for (const c of state.cases) {
      const data = caseDataToRow(c, userId);
      await prisma.case.upsert({
        where: { id: c.meta.id },
        create: { ...data, id: c.meta.id },
        update: data,
      });
    }

    // Propagate deletions: drop rows for this owner no longer present in state.
    const ids = state.cases.map((c) => c.meta.id);
    await prisma.case.deleteMany({ where: { userId, id: { notIn: ids } } });

    if (userId) {
      await prisma.profile
        .update({
          where: { id: userId },
          data: { prefs: state.prefs as unknown as Prisma.InputJsonValue },
        })
        .catch(() => {
          // profile row may not exist yet (created by the auth trigger on signup)
        });
    }
  } catch {
    // best-effort: the session stays usable in memory even if persistence fails
  }
}
