"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

interface CaseItem {
  id: string;
  title: string;
  status: string;
  claimAmount?: number;
  claimType?: string;
  createdAt: string;
}

export default function Home() {
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const mockCases: CaseItem[] = [
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
    setCases(mockCases);
    setLoading(false);
  }, []);

  const containerStyle: React.CSSProperties = {
    maxWidth: "800px",
    margin: "0 auto",
    padding: "2rem 1.5rem",
  };

  const headerRowStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1rem",
  };

  const subtitleStyle: React.CSSProperties = {
    color: "#666",
    marginBottom: "2rem",
  };

  const cardStyle: React.CSSProperties = {
    display: "block",
    padding: "1.5rem",
    backgroundColor: "#fff",
    border: "1px solid #e0e0e0",
    borderRadius: "8px",
    textDecoration: "none",
    color: "inherit",
    marginBottom: "0.75rem",
    transition: "box-shadow 0.2s",
  };

  const badgeStyle: React.CSSProperties = {
    padding: "0.25rem 0.75rem",
    borderRadius: "4px",
    fontSize: "0.85rem",
    textTransform: "capitalize",
  };

  const emptyStateStyle: React.CSSProperties = {
    padding: "2rem",
    backgroundColor: "#f5f5f5",
    borderRadius: "8px",
    textAlign: "center",
  };

  const featuresBoxStyle: React.CSSProperties = {
    marginTop: "3rem",
    padding: "1.5rem",
    backgroundColor: "#f0f7ff",
    borderRadius: "8px",
  };

  return (
    <main style={containerStyle}>
      <div style={headerRowStyle}>
        <div>
          <h1 style={{ fontSize: "2rem", fontWeight: "600", color: "#000000", margin: "0 0 0.5rem 0" }}>
            Making Claims Easier
          </h1>
          <p style={{ color: "#666", margin: 0 }}>
            Turn your own account into a clear, court-ready case for Singapore's Small Claims Tribunal.
          </p>
        </div>
        <Link
          href="/case-new"
          style={{
            padding: "0.75rem 1.5rem",
            backgroundColor: "#0066cc",
            color: "#ffffff",
            border: "none",
            borderRadius: "6px",
            fontSize: "1rem",
            fontWeight: "500",
            cursor: "pointer",
            textDecoration: "none",
            whiteSpace: "nowrap",
          }}
        >
          + Add New Case
        </Link>
      </div>

      <h2 style={{ fontSize: "1.25rem", fontWeight: "600", color: "#000000", marginBottom: "1rem", marginTop: "2rem" }}>
        Previous Cases
      </h2>

      {loading ? (
        <p style={{ color: "#666" }}>Loading cases...</p>
      ) : cases.length === 0 ? (
        <div style={emptyStateStyle}>
          <p style={{ color: "#666", marginBottom: "1rem" }}>No cases yet. Create your first case to get started.</p>
          <Link
            href="/case-new"
            style={{
              display: "inline-block",
              padding: "0.75rem 1.5rem",
              backgroundColor: "#0066cc",
              color: "#ffffff",
              border: "none",
              borderRadius: "6px",
              fontSize: "1rem",
              fontWeight: "500",
              cursor: "pointer",
              textDecoration: "none",
            }}
          >
            Create Case
          </Link>
        </div>
      ) : (
        cases.map((caseItem) => (
          <Link
            key={caseItem.id}
            href={`/case/${caseItem.id}`}
            style={cardStyle}
            onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)")}
            onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1.125rem", fontWeight: "600", color: "#000000" }}>
                  {caseItem.title}
                </h3>
                <p style={{ margin: "0.25rem 0", color: "#666", fontSize: "0.9rem" }}>
                  {caseItem.claimType} &middot; SGD {caseItem.claimAmount?.toLocaleString()}
                </p>
                <p style={{ margin: "0.25rem 0", color: "#999", fontSize: "0.85rem" }}>
                  Created: {new Date(caseItem.createdAt).toLocaleDateString("en-SG")}
                </p>
              </div>
              <span style={{
                ...badgeStyle,
                backgroundColor: caseItem.status === "draft" ? "#fff3cd" : "#d4edda",
                color: caseItem.status === "draft" ? "#856404" : "#155724",
              }}>
                {caseItem.status}
              </span>
            </div>
          </Link>
        ))
      )}

      <div style={featuresBoxStyle}>
        <h2 style={{ fontSize: "1.125rem", fontWeight: "600", color: "#000000", marginTop: 0, marginBottom: "0.75rem" }}>
          Active Features
        </h2>
        <ul style={{ margin: 0, paddingLeft: "1.25rem", lineHeight: "1.8" }}>
          <li>
            <strong>Evidence organiser + audio transcription</strong> — extract structured facts from images and audio.
          </li>
          <li>
            <strong>Hearing prep</strong> — turn your witness statement into a hearing script and rehearse with mock Q&A.
          </li>
        </ul>
      </div>

      <p style={{ marginTop: "2rem", fontSize: "0.85rem", color: "#666", lineHeight: "1.6" }}>
        This output is generated to help you organise your own case for the Small Claims Tribunal.
        It is information, not legal advice, and does not predict any outcome. The official CJTS pre-filing
        assessment and the Tribunal are the authority.
      </p>
    </main>
  );
}