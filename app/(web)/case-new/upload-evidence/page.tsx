"use client";

import Link from "next/link";
<<<<<<< Updated upstream
import { useState } from "react";

export default function UploadEvidencePage() {
=======
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function UploadEvidencePage() {
  const router = useRouter();
>>>>>>> Stashed changes
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setError("Please select at least one file to upload.");
      return;
    }

    setUploading(true);
    setError(null);

<<<<<<< Updated upstream
    setTimeout(() => {
      setUploading(false);
      setSuccess(true);
=======
    // Simulate upload delay for demo purposes
    setTimeout(() => {
      setUploading(false);
      setSuccess(true);
      // In a real implementation, this would call the evidence API
      // and then redirect to the case detail page with the evidence timeline
>>>>>>> Stashed changes
    }, 1500);
  };

  const handleRemoveFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  return (
<<<<<<< Updated upstream
    <div style={{ maxWidth: "600px", margin: "0 auto", padding: "2rem 1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: "600", color: "#000000", margin: 0 }}>Upload Evidence</h1>
        <Link href="/case-new" style={{ color: "#0066cc", textDecoration: "none", fontWeight: "500" }}>
          Back to Form
=======
    <div style={{ maxWidth: "600px", margin: "0 auto", padding: "2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <h1>Upload Evidence</h1>
        <Link href="/case-new" style={{ color: "#0070f3", textDecoration: "underline" }}>
          ← Back to Form
>>>>>>> Stashed changes
        </Link>
      </div>

      {error && (
<<<<<<< Updated upstream
        <div style={{ padding: "1rem", backgroundColor: "#ffebee", color: "#c62828", borderRadius: "6px", marginBottom: "1.5rem" }}>
=======
        <div style={{ padding: "1rem", backgroundColor: "#ffebee", color: "#c62828", borderRadius: "4px", marginBottom: "1rem" }}>
>>>>>>> Stashed changes
          {error}
        </div>
      )}

      {success && (
<<<<<<< Updated upstream
        <div style={{ padding: "1rem", backgroundColor: "#e8f5e9", color: "#2e7d32", borderRadius: "6px", marginBottom: "1.5rem" }}>
=======
        <div style={{ padding: "1rem", backgroundColor: "#e8f5e9", color: "#2e7d32", borderRadius: "4px", marginBottom: "1rem" }}>
>>>>>>> Stashed changes
          Evidence uploaded successfully!
        </div>
      )}

      <div style={{ marginBottom: "1.5rem" }}>
<<<<<<< Updated upstream
        <label htmlFor="fileUpload" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500", color: "#1a1a1a" }}>
=======
        <label htmlFor="fileUpload" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>
>>>>>>> Stashed changes
          Select Files
        </label>
        <input
          id="fileUpload"
          type="file"
          multiple
          accept="image/*,.pdf,.mp3,.wav,.txt"
          onChange={handleFileChange}
<<<<<<< Updated upstream
          style={{ width: "100%", padding: "0.625rem 0.75rem", border: "1px solid #e0e0e0", borderRadius: "6px", fontSize: "0.95rem", color: "#1a1a1a", background: "#ffffff" }}
=======
          style={{ marginBottom: "1rem" }}
>>>>>>> Stashed changes
        />
      </div>

      {files.length > 0 && (
        <div style={{ marginBottom: "1.5rem" }}>
<<<<<<< Updated upstream
          <h3 style={{ fontSize: "1rem", marginBottom: "0.75rem", color: "#000000" }}>Selected Files:</h3>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {files.map((file, index) => (
              <li key={index} style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "0.625rem 0.75rem",
                backgroundColor: "#f8f9fa",
                marginBottom: "0.5rem",
                borderRadius: "6px",
              }}>
                <span style={{ fontSize: "0.9rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "80%", color: "#1a1a1a" }}>
                  {file.name}
                </span>
                <button
                  onClick={() => handleRemoveFile(index)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#c62828",
                    cursor: "pointer",
                    fontSize: "1.25rem",
                    lineHeight: 1,
                    padding: "0 0.25rem",
                  }}
=======
          <h3 style={{ marginBottom: "0.5rem" }}>Selected Files:</h3>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {files.map((file, index) => (
              <li key={index} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem", backgroundColor: "#f5f5f5", marginBottom: "0.5rem", borderRadius: "4px" }}>
                <span>{file.name}</span>
                <button
                  onClick={() => handleRemoveFile(index)}
                  style={{ background: "none", border: "none", color: "#c62828", cursor: "pointer", fontSize: "1.2rem" }}
>>>>>>> Stashed changes
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

<<<<<<< Updated upstream
      <div style={{ display: "flex", gap: "0.75rem", marginTop: "2rem" }}>
=======
      <div style={{ display: "flex", gap: "1rem", marginTop: "2rem" }}>
>>>>>>> Stashed changes
        <button
          onClick={handleUpload}
          disabled={uploading || files.length === 0}
          style={{
            flex: 1,
<<<<<<< Updated upstream
            padding: "0.625rem 1.25rem",
            backgroundColor: uploading ? "#90caf9" : "#28a745",
            color: "#ffffff",
            border: "none",
            borderRadius: "6px",
            fontSize: "0.95rem",
            fontWeight: "500",
=======
            padding: "0.75rem 1.5rem",
            backgroundColor: uploading ? "#90caf9" : "#4caf50",
            color: "white",
            border: "none",
            borderRadius: "4px",
            fontSize: "1rem",
>>>>>>> Stashed changes
            cursor: uploading || files.length === 0 ? "not-allowed" : "pointer",
          }}
        >
          {uploading ? "Uploading..." : "Upload Evidence"}
        </button>

        <Link
          href="/"
          style={{
            flex: 1,
<<<<<<< Updated upstream
            padding: "0.625rem 1.25rem",
            backgroundColor: "#6c757d",
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
            backgroundColor: "#757575",
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
          Skip & Go Home
        </Link>
      </div>
    </div>
  );
}