import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/supabase/server";

// GET /api/cases/[id] — one case (with its evidence) from the database, scoped
// to the signed-in user. No mock data.

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    const userId = user?.id ?? null;

    const found = await prisma.case.findFirst({
      where: { id, userId },
      include: {
        evidence: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            sourceFile: true,
            kind: true,
            extract: true,
            evidenceLinked: true,
            createdAt: true,
          },
        },
      },
    });

    if (!found) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    return NextResponse.json({ case: found });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch case" },
      { status: 500 },
    );
  }
}
