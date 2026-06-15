import { NextResponse } from "next/server";

/**
 * GET /api/cases/[id] - Get a specific case with its evidence
 */

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // Mock data for now - will connect to database later
    const mockCase = {
      id,
      title: "ABC Pte Ltd - Failed Repairs",
      status: "draft",
      claimAmount: 2000,
      claimType: "Service dispute",
      evidence: [
        {
          id: "ev1",
          sourceFile: "invoice_20260103.jpg",
          kind: "image",
          date: "2026-01-03",
          summary: "Invoice for repair services totaling $2,000",
          extractedText: "Invoice #INV-2026-001\nDate: 3 Jan 2026\nABC Pte Ltd\nAmount: $2,000",
        },
        {
          id: "ev2",
          sourceFile: "photo_defect.jpg",
          kind: "image",
          date: "2026-01-10",
          summary: "Photo showing defective workmanship",
          extractedText: "Photo taken on 10 Jan 2026 showing incomplete repair work",
        },
        {
          id: "ev3",
          sourceFile: "chat_log.txt",
          kind: "image",
          date: "2026-01-15",
          summary: "WhatsApp conversation with contractor about failed repairs",
          extractedText: "You: When will you complete the repairs?\nContractor: I will try next week.",
        },
      ],
    };

    return NextResponse.json({ case: mockCase });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch case" },
      { status: 500 },
    );
  }
}