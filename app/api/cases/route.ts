import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/supabase/server";

// GET  /api/cases — list the signed-in user's cases (from the database).
// POST /api/cases — create a new case for the signed-in user.
//
// No mock data: every row comes from Postgres, scoped to the owner. Prisma
// bypasses Supabase RLS, so ownership is enforced here by filtering on userId.

export async function GET() {
  const user = await getCurrentUser();
  const userId = user?.id ?? null;

  const rows = await prisma.case.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      status: true,
      amountStr: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ cases: rows });
}

export async function POST(req: Request) {
  try {
    const { title, claimAmount } = (await req.json()) as {
      title?: string;
      claimAmount?: number;
      claimType?: string;
    };

    if (!title?.trim()) {
      return NextResponse.json(
        { error: "Case name is required" },
        { status: 400 },
      );
    }

    const user = await getCurrentUser();

    const created = await prisma.case.create({
      data: {
        userId: user?.id ?? null,
        title: title.trim(),
        status: "draft",
        amountStr:
          typeof claimAmount === "number" && !Number.isNaN(claimAmount)
            ? `S$${claimAmount.toLocaleString("en-SG", { minimumFractionDigits: 2 })}`
            : null,
      },
      select: { id: true, title: true, status: true, amountStr: true, createdAt: true },
    });

    return NextResponse.json({ case: created }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create case" },
      { status: 500 },
    );
  }
}
