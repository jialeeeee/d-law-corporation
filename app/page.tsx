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

  return (
    <main style={{ maxWidth: "800px", margin: "0 auto", padding: "3rem 1.5rem" }}>
      {/* Hero Section */}
      <div style={{ textAlign: "center", marginBottom: "3rem" }}>
        <h1 style={{
          fontSize: "2.5rem",
          fontWeight: "700",
          color: "#000000",
          margin: "0 0 1rem 0",
          letterSpacing: "-0.03em",
          lineHeight: "1.2",
        }}>
          Making Claims Easier
        </h1>
        <p style={{
          fontSize: "1.125rem",
          color: "#555",
          maxWidth: "600px",
          margin: "0 auto 1.5rem",
          lineHeight: "1.6",
        }}>
          Turn your own account into a clear, court-ready case for Singapore's
          Small Claims Tribunal. Organise evidence, prepare your hearing script, and submit with confidence.
        </p>
        <Link
          href="/case-new"
          style={{
            display: "inline-block",
            padding: "0.875rem 2rem",
            backgroundColor: "#0066cc",
            color: "#ffffff",
            border: "none",
            borderRadius: "8px",
            fontSize: "1rem",
            fontWeight: "600",
            cursor: "pointer",
            textDecoration: "none",
            boxShadow: "0 2px 4px rgba(0, 102, 204, 0.2)",
            transition: "background-color 0.2s, box-shadow 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#0052a3";
            e.currentTarget.style.boxShadow = "0 4px 8px rgba(0, 102, 204, 0.3)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "#0066cc";
            e.currentTarget.style.boxShadow = "0 2px 4px rgba(0, 102, 204, 0.2)";
          }}
        >
          + Add New Case
        </Link>
      </div>

      {/* Divider */}
      <div style={{ borderTop: "1px solid #e0e0e0", margin: "0 0 2.5rem" }} />

      {/* Previous Cases Section */}
      <div style={{ marginBottom: "3rem" }}>
        <h2 style={{
          fontSize: "1.375rem",
          fontWeight: "600",
          color: "#000000",
          margin: "0 0 1.25rem 0",
        }}>
          Your Cases
        </h2>

        {loading ? (
          <p style={{ color: "#666", textAlign: "center", padding: "2rem 0" }}>Loading cases...</p>
        ) : cases.length === 0 ? (
          <div style={{
            padding: "3rem 2rem",
            backgroundColor: "#f8f9fa",
            borderRadius: "12px",
            textAlign: "center",
            border: "1px solid #e0e0e0",
          }}>
            <p style={{ color: "#666", fontSize: "1.1rem", marginBottom: "1.5rem" }}>
              No cases yet. Create your first case to get started.
            </p>
            <Link
              href="/case-new"
              style={{
                display: "inline-block",
                padding: "0.75rem 1.5rem",
                backgroundColor: "#0066cc",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                fontSize: "0.95rem",
                fontWeight: "500",
                cursor: "pointer",
                textDecoration: "none",
              }}
            >
              Create Case
            </Link>
          </div>
        ) : (
          <div style={{ display: "grid", gap: "0.75rem" }}>
            {cases.map((caseItem) => (
              <Link
                key={caseItem.id}
                href={`/case/${caseItem.id}`}
                style={{
                  display: "block",
                  padding: "1.25rem 1.5rem",
                  backgroundColor: "#ffffff",
                  border: "1px solid #e0e0e0",
                  borderRadius: "10px",
                  textDecoration: "none",
                  color: "inherit",
                  transition: "box-shadow 0.2s, border-color 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.08)";
                  e.currentTarget.style.borderColor = "#0066cc";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.borderColor = "#e0e0e0";
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{
                      margin: "0 0 0.375rem 0",
                      fontSize: "1.05rem",
                      fontWeight: "600",
                      color: "#000000",
                    }}>
                      {caseItem.title}
                    </h3>
                    <p style={{
                      margin: "0.25rem 0 0 0",
                      color: "#666",
                      fontSize: "0.9rem",
                    }}>
                      {caseItem.claimType} &middot; SGD {caseItem.claimAmount?.toLocaleString()}
                    </p>
                    <p style={{
                      margin: "0.25rem 0 0 0",
                      color: "#999",
                      fontSize: "0.8rem",
                    }}>
                      Created: {new Date(caseItem.createdAt).toLocaleDateString("en-SG", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <span style={{
                    padding: "0.3rem 0.75rem",
                    borderRadius: "20px",
                    fontSize: "0.8rem",
                    fontWeight: "600",
                    backgroundColor: caseItem.status === "draft" ? "#fff3cd" : "#d4edda",
                    color: caseItem.status === "draft" ? "#856404" : "#155724",
                    whiteSpace: "nowrap",
                    marginLeft: "1rem",
                  }}>
                    {caseItem.status.charAt(0).toUpperCase() + caseItem.status.slice(1)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Features Section */}
      <div style={{
        padding: "2rem",
        backgroundColor: "#f8f9fa",
        borderRadius: "12px",
        border: "1px solid #e0e0e0",
        marginBottom: "2rem",
      }}>
        <h2 style={{
          fontSize: "1.25rem",
          fontWeight: "600",
          color: "#000000",
          marginTop: 0,
          marginBottom: "1rem",
          textAlign: "center",
        }}>
          What Dlaw Helps You Do
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1.5rem" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              backgroundColor: "#e3f2fd",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 0.75rem",
              fontSize: "1.5rem",
            }}>
              📎
            </div>
            <h3 style={{ fontSize: "1rem", fontWeight: "600", color: "#000000", margin: "0 0 0.5rem" }}>
              Organise Evidence
            </h3>
            <p style={{ fontSize: "0.9rem", color: "#666", margin: 0, lineHeight: "1.5" }}>
              Upload images, audio, chats. Evidence is organised chronologically with AI extraction.
            </p>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              backgroundColor: "#e8f5e9",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 0.75rem",
              fontSize: "1.5rem",
            }}>
              📝
            </div>
            <h3 style={{ fontSize: "1rem", fontWeight: "600", color: "#000000", margin: "0 0 0.5rem" }}>
              Prepare for Hearing
            </h3>
            <p style={{ fontSize: "0.9rem", color: "#666", margin: 0, lineHeight: "1.5" }}>
              Turn your witness statement into a hearing script and rehearse with mock Q&A.
            </p>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              backgroundColor: "#fff3e0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 0.75rem",
              fontSize: "1.5rem",
            }}>
              ⚖️
            </div>
            <h3 style={{ fontSize: "1rem", fontWeight: "600", color: "#000000", margin: "0 0 0.5rem" }}>
              Court-Ready Output
            </h3>
            <p style={{ fontSize: "0.9rem", color: "#666", margin: 0, lineHeight: "1.5" }}>
              Generate a structured, numbered statement of facts aligned with SCT requirements.
            </p>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <p style={{
        marginTop: "2rem",
        fontSize: "0.85rem",
        color: "#888",
        lineHeight: "1.6",
        textAlign: "center",
        borderTop: "1px solid #eee",
        paddingTop: "1.5rem",
      }}>
        This output is generated to help you organise your own case for the Small Claims Tribunal.
        It is information, not legal advice, and does not predict any outcome. The official CJTS pre-filing
        assessment and the Tribunal are the authority.
      </p>
    </main>
  );
}