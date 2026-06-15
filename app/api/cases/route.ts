import { NextResponse } from "next/server";
<<<<<<< Updated upstream
=======
import { prisma } from "@/lib/db";
>>>>>>> Stashed changes

/**
 * GET /api/cases - List all cases
 * POST /api/cases - Create a new case
 */

export async function GET() {
<<<<<<< Updated upstream
  // Mock data for now - will connect to database later
  const mockCases = [
    {
      id: "clrd001",
      title: "ABC Pte Ltd - Failed Repairs",
      status: "draft",
      claimAmount: 2000,
      claimType: "Service dispute",
      createdAt: "2026-01-03T00:00:00Z",
    },
    {
      id: "clrd002",
      title: "XYZ Electronics - Defective Goods",
      status: "draft",
      claimAmount: 850,
      claimType: "Goods dispute",
      createdAt: "2025-12-15T00:00:00Z",
    },
  ];

  return NextResponse.json({ cases: mockCases });
=======
  try {
    const cases = await prisma.case.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });
    return NextResponse.json({ cases });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch cases" },
      { status: 500 },
    );
  }
>>>>>>> Stashed changes
}

export async function POST(req: Request) {
  try {
    const { title, claimAmount, claimType } = await req.json();

    if (!title) {
      return NextResponse.json(
        { error: "Case name is required" },
        { status: 400 },
      );
    }

<<<<<<< Updated upstream
    // Generate a mock ID for the new case
    const newCase = {
      id: `clrd${Date.now()}`,
      title,
      status: "draft",
      claimAmount,
      claimType,
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({ case: newCase }, { status: 201 });
=======
    const caseData = await prisma.case.create({
      data: {
        title,
        status: "draft",
      },
    });

    return NextResponse.json({ case: caseData }, { status: 201 });
>>>>>>> Stashed changes
  } catch {
    return NextResponse.json(
      { error: "Failed to create case" },
      { status: 500 },
    );
  }
}