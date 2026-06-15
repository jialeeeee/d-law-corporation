"use client";

import Link from "next/link";
<<<<<<< Updated upstream
=======
import { useRouter } from "next/navigation";
>>>>>>> Stashed changes
import { useState, useEffect } from "react";

interface EvidenceItem {
  id: string;
  sourceFile: string;
  kind: string;
  date: string;
  summary: string;
  extractedText?: string;
}

interface CaseData {
  id: string;
  title: string;
  status: string;
  claimAmount?: number;
  claimType?: string;
  evidence: EvidenceItem[];
}

<<<<<<< Updated upstream
export default function CaseDetailPage() {
  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const mockCase: CaseData = {
      id: "clrd123",
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
    setCaseData(mockCase);
    setLoading(false);
=======
export default function CaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCase() {
      try {
        // For now, use mock data since the API is not implemented yet
        // In production, this would fetch from /api/cases/[id]
        const mockCase: CaseData = {
          id: "clrd123",
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
        setCaseData(mockCase);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load case");
      } finally {
        setLoading(false);
      }
    }
    fetchCase();
>>>>>>> Stashed changes
  }, []);

  if (loading) {
    return (
<<<<<<< Updated upstream
      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem 1.5rem", textAlign: "center" }}>
        <p style={{ color: "#666" }}>Loading case...</p>
=======
      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem", textAlign: "center" }}>
        <p>Loading case...</p>
>>>>>>> Stashed changes
      </div>
    );
  }

<<<<<<< Updated upstream
  if (!caseData) {
    return (
      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem 1.5rem" }}>
        <p style={{ color: "#c62828" }}>Case not found</p>
        <Link href="/" style={{ color: "#0066cc" }}>Back to Cases</Link>
=======
  if (error || !caseData) {
    return (
      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem" }}>
        <p style={{ color: "#c62828" }}>{error || "Case not found"}</p>
        <Link href="/" style={{ color: "#0070f3" }}>← Back to Cases</Link>
>>>>>>> Stashed changes
      </div>
    );
  }

<<<<<<< Updated upstream
=======
  // Sort evidence by date chronologically
>>>>>>> Stashed changes
  const sortedEvidence = [...caseData.evidence].sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

<<<<<<< Updated upstream
  const containerStyle: React.CSSProperties = {
    maxWidth: "800px",
    margin: "0 auto",
    padding: "2rem 1.5rem",
  };

  const headerRowStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1.5rem",
  };

  const infoCardStyle: React.CSSProperties = {
    padding: "1.25rem",
    backgroundColor: "#fff",
    border: "1px solid #e0e0e0",
    borderRadius: "8px",
    marginBottom: "2rem",
  };

  const timelineItemStyle: React.CSSProperties = {
    position: "relative",
    paddingLeft: "2rem",
    paddingBottom: "1.5rem",
    borderLeft: "2px solid #e0e0e0",
    marginLeft: "0.5rem",
  };

  const dotStyle: React.CSSProperties = {
    position: "absolute",
    left: "-7px",
    top: "0",
    width: "12px",
    height: "12px",
    borderRadius: "50%",
    backgroundColor: "#0066cc",
    border: "2px solid #fff",
  };

  const evidenceCardStyle: React.CSSProperties = {
    padding: "1rem",
    backgroundColor: "#f8f9fa",
    border: "1px solid #e0e0e0",
    borderRadius: "6px",
  };

  return (
    <main style={containerStyle}>
      <div style={headerRowStyle}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: "600", color: "#000000", margin: 0 }}>
          {caseData.title}
        </h1>
        <Link href="/" style={{ color: "#0066cc", textDecoration: "none", fontWeight: "500" }}>
          Back to Cases
=======
  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <h1>{caseData.title}</h1>
        <Link href="/" style={{ color: "#0070f3", textDecoration: "underline" }}>
          ← Back to Cases
>>>>>>> Stashed changes
        </Link>
      </div>

      {/* Case Info Card */}
<<<<<<< Updated upstream
      <div style={infoCardStyle}>
        <h2 style={{ fontSize: "1.125rem", fontWeight: "600", color: "#000000", marginTop: 0, marginBottom: "1rem" }}>
          Case Details
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "1rem" }}>
          <div>
            <p style={{ margin: 0, fontSize: "0.8rem", color: "#666", textTransform: "uppercase" }}>Status</p>
            <p style={{ margin: "0.25rem 0 0 0", fontWeight: "500", color: "#000000" }}>{caseData.status}</p>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: "0.8rem", color: "#666", textTransform: "uppercase" }}>Claim Amount</p>
            <p style={{ margin: "0.25rem 0 0 0", fontWeight: "500", color: "#000000" }}>SGD {caseData.claimAmount?.toLocaleString()}</p>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: "0.8rem", color: "#666", textTransform: "uppercase" }}>Claim Type</p>
            <p style={{ margin: "0.25rem 0 0 0", fontWeight: "500", color: "#000000" }}>{caseData.claimType}</p>
          </div>
        </div>
      </div>

      {/* Evidence Timeline */}
      <h2 style={{ fontSize: "1.25rem", fontWeight: "600", color: "#000000", marginBottom: "1.25rem" }}>
        Evidence Timeline
      </h2>

      <div>
        {sortedEvidence.map((item) => (
          <div key={item.id} style={timelineItemStyle}>
            <div style={dotStyle} />
            <div style={evidenceCardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <span style={{ fontSize: "0.85rem", color: "#666", fontWeight: "500" }}>
                  {new Date(item.date).toLocaleDateString("en-SG", { year: "numeric", month: "long", day: "numeric" })}
                </span>
                <span style={{
                  padding: "0.2rem 0.6rem",
                  borderRadius: "4px",
                  fontSize: "0.75rem",
                  fontWeight: "500",
                  backgroundColor: "#e9ecef",
                  color: "#495057",
=======
      <div style={{ padding: "1.5rem", backgroundColor: "#f5f5f5", borderRadius: "8px", marginBottom: "2rem" }}>
        <h2 style={{ marginTop: 0 }}>Case Details</h2>
        <p><strong>Status:</strong> {caseData.status}</p>
        <p><strong>Claim Amount:</strong> SGD {caseData.claimAmount?.toLocaleString()}</p>
        <p><strong>Claim Type:</strong> {caseData.claimType}</p>
      </div>

      {/* Evidence Timeline */}
      <h2 style={{ marginBottom: "1rem" }}>Evidence Timeline</h2>
      <div style={{ position: "relative", paddingLeft: "2rem" }}>
        {/* Vertical line for timeline */}
        <div style={{ position: "absolute", left: "8px", top: "0", bottom: "0", width: "2px", backgroundColor: "#e0e0e0" }} />

        {sortedEvidence.map((item, index) => (
          <div key={item.id} style={{ position: "relative", marginBottom: "1.5rem", paddingLeft: "1.5rem" }}>
            {/* Timeline dot */}
            <div style={{
              position: "absolute",
              left: "-2rem",
              top: "1rem",
              width: "18px",
              height: "18px",
              borderRadius: "50%",
              backgroundColor: "#0070f3",
              border: "3px solid white",
              zIndex: 1,
            }} />

            <div style={{
              padding: "1rem",
              backgroundColor: index % 2 === 0 ? "#e3f2fd" : "#f1f8e9",
              borderRadius: "8px",
              border: "1px solid #e0e0e0",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <span style={{ fontWeight: "bold", fontSize: "0.9rem" }}>
                  {new Date(item.date).toLocaleDateString("en-SG", { year: "numeric", month: "long", day: "numeric" })}
                </span>
                <span style={{
                  fontSize: "0.75rem",
                  padding: "0.25rem 0.5rem",
                  backgroundColor: "#e0e0e0",
                  borderRadius: "4px",
                  textTransform: "uppercase",
>>>>>>> Stashed changes
                }}>
                  {item.kind}
                </span>
              </div>

<<<<<<< Updated upstream
              <p style={{ margin: "0.5rem 0", fontWeight: "500", color: "#000000" }}>{item.summary}</p>
              <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.85rem", color: "#666" }}>
                Source: {item.sourceFile}
              </p>

              {item.extractedText && (
                <details style={{ marginTop: "0.75rem" }}>
                  <summary style={{ cursor: "pointer", color: "#0066cc", fontSize: "0.85rem" }}>
                    View extracted text
                  </summary>
=======
              <p style={{ margin: "0.5rem 0" }}><strong>File:</strong> {item.sourceFile}</p>
              <p style={{ margin: "0.5rem 0" }}>{item.summary}</p>

              {item.extractedText && (
                <details style={{ marginTop: "0.5rem" }}>
                  <summary style={{ cursor: "pointer", color: "#0070f3", fontSize: "0.85rem" }}>View extracted text</summary>
>>>>>>> Stashed changes
                  <pre style={{
                    marginTop: "0.5rem",
                    padding: "0.75rem",
                    backgroundColor: "#fff",
                    border: "1px solid #e0e0e0",
<<<<<<< Updated upstream
                    borderRadius: "6px",
                    fontSize: "0.85rem",
                    lineHeight: "1.5",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    margin: 0,
=======
                    borderRadius: "4px",
                    fontSize: "0.85rem",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
>>>>>>> Stashed changes
                  }}>
                    {item.extractedText}
                  </pre>
                </details>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add Evidence Button */}
      <div style={{ marginTop: "2rem" }}>
        <Link
          href="/case-new/upload-evidence"
          style={{
            display: "inline-block",
<<<<<<< Updated upstream
            padding: "0.625rem 1.25rem",
            backgroundColor: "#28a745",
            color: "#ffffff",
            border: "none",
            borderRadius: "6px",
            fontSize: "0.95rem",
            fontWeight: "500",
=======
            padding: "0.75rem 1.5rem",
            backgroundColor: "#4caf50",
            color: "white",
            border: "none",
            borderRadius: "4px",
            fontSize: "1rem",
>>>>>>> Stashed changes
            cursor: "pointer",
            textDecoration: "none",
          }}
        >
          + Add More Evidence
        </Link>
      </div>
<<<<<<< Updated upstream
    </main>
=======
    </div>
>>>>>>> Stashed changes
  );
}