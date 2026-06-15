"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NewCasePage() {
  const router = useRouter();
  const [caseName, setCaseName] = useState("");
  const [claimAmount, setClaimAmount] = useState("");
  const [claimType, setClaimType] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const claimTypes = [
    "Service dispute",
    "Goods dispute",
    "Workmanship dispute",
    "Overpayment",
    "Other",
  ];

  const handleSaveCase = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!caseName.trim() || !claimAmount || !claimType) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: caseName,
          claimAmount: parseFloat(claimAmount),
          claimType,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to create case. Please try again.");
      }

      const data = await res.json();
      router.push(`/case/${data.case.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
<<<<<<< Updated upstream
    <div style={{ maxWidth: "600px", margin: "0 auto", padding: "2rem 1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: "600", color: "#000000", margin: 0 }}>Create New Case</h1>
        <Link href="/" style={{ color: "#0066cc", textDecoration: "none", fontWeight: "500" }}>
          Back to Cases
        </Link>
      </div>

      {error && (
        <div style={{ padding: "1rem", backgroundColor: "#ffebee", color: "#c62828", borderRadius: "6px", marginBottom: "1.5rem" }}>
=======
    <div style={{ maxWidth: "600px", margin: "0 auto", padding: "2rem" }}>
      <div className="flex-between mb-3">
        <h1 style={{ margin: 0 }}>Create New Case</h1>
        <Link href="/">Back to Cases</Link>
      </div>

      {error && (
      </div>

      {error && (
        <div style={{ padding: "1rem", backgroundColor: "#ffebee", color: "#c62828", borderRadius: "4px", marginBottom: "1rem" }}>
>>>>>>> Stashed changes
          {error}
        </div>
      )}

      <form onSubmit={handleSaveCase}>
        <div style={{ marginBottom: "1.5rem" }}>
<<<<<<< Updated upstream
          <label htmlFor="caseName" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500", color: "#1a1a1a" }}>
=======
          <label htmlFor="caseName" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>
>>>>>>> Stashed changes
            Case Name
          </label>
          <input
            id="caseName"
            type="text"
            value={caseName}
            onChange={(e) => setCaseName(e.target.value)}
            placeholder="e.g., ABC Pte Ltd - Failed Repairs"
<<<<<<< Updated upstream
            required
            style={{ width: "100%", padding: "0.625rem 0.75rem", border: "1px solid #e0e0e0", borderRadius: "6px", fontSize: "0.95rem", color: "#1a1a1a", background: "#ffffff" }}
=======
            style={{ width: "100%", padding: "0.75rem", border: "1px solid #ccc", borderRadius: "4px", fontSize: "1rem" }}
>>>>>>> Stashed changes
          />
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
<<<<<<< Updated upstream
          <label htmlFor="claimAmount" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500", color: "#1a1a1a" }}>
=======
          <label htmlFor="claimAmount" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>
>>>>>>> Stashed changes
            Claim Amount (SGD)
          </label>
          <input
            id="claimAmount"
            type="number"
            value={claimAmount}
            onChange={(e) => setClaimAmount(e.target.value)}
            placeholder="e.g., 2000"
            min="0"
            step="0.01"
<<<<<<< Updated upstream
            required
            style={{ width: "100%", padding: "0.625rem 0.75rem", border: "1px solid #e0e0e0", borderRadius: "6px", fontSize: "0.95rem", color: "#1a1a1a", background: "#ffffff" }}
=======
            style={{ width: "100%", padding: "0.75rem", border: "1px solid #ccc", borderRadius: "4px", fontSize: "1rem" }}
>>>>>>> Stashed changes
          />
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
<<<<<<< Updated upstream
          <label htmlFor="claimType" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500", color: "#1a1a1a" }}>
=======
          <label htmlFor="claimType" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>
>>>>>>> Stashed changes
            Type of Claim
          </label>
          <select
            id="claimType"
            value={claimType}
            onChange={(e) => setClaimType(e.target.value)}
<<<<<<< Updated upstream
            required
            style={{ width: "100%", padding: "0.625rem 0.75rem", border: "1px solid #e0e0e0", borderRadius: "6px", fontSize: "0.95rem", color: "#1a1a1a", background: "#ffffff" }}
=======
            style={{ width: "100%", padding: "0.75rem", border: "1px solid #ccc", borderRadius: "4px", fontSize: "1rem" }}
>>>>>>> Stashed changes
          >
            <option value="">Select a claim type</option>
            {claimTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

<<<<<<< Updated upstream
        <div style={{ display: "flex", gap: "0.75rem", marginTop: "2rem" }}>
=======
        <div style={{ display: "flex", gap: "1rem", marginTop: "2rem" }}>
>>>>>>> Stashed changes
          <button
            type="submit"
            disabled={loading}
            style={{
              flex: 1,
<<<<<<< Updated upstream
              padding: "0.625rem 1.25rem",
              backgroundColor: loading ? "#90caf9" : "#0066cc",
              color: "#ffffff",
              border: "none",
              borderRadius: "6px",
              fontSize: "0.95rem",
              fontWeight: "500",
=======
              padding: "0.75rem 1.5rem",
              backgroundColor: loading ? "#90caf9" : "#0070f3",
              color: "white",
              border: "none",
              borderRadius: "4px",
              fontSize: "1rem",
>>>>>>> Stashed changes
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Saving..." : "Save Case"}
          </button>

          <Link
            href="/case-new/upload-evidence"
            style={{
              flex: 1,
<<<<<<< Updated upstream
              padding: "0.625rem 1.25rem",
              backgroundColor: "#28a745",
              color: "#ffffff",
              border: "none",
              borderRadius: "6px",
              fontSize: "0.95rem",
              fontWeight: "500",
              cursor: "pointer",
              textAlign: "center",
              textDecoration: "none",
              display: "block",
              lineHeight: "1.5",
              alignItems: "center",
=======
              padding: "0.75rem 1.5rem",
              backgroundColor: "#4caf50",
              color: "white",
              border: "none",
              borderRadius: "4px",
              fontSize: "1rem",
              cursor: "pointer",
              textAlign: "center",
              textDecoration: "none",
              display: "inline-block",
>>>>>>> Stashed changes
            }}
          >
            Upload Evidence →
          </Link>
        </div>
      </form>
    </div>
  );
}