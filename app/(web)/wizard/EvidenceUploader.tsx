"use client";

// Feature 2 — Evidence text extraction UI (feat/evidence-docs).
// Deliberately minimal for now: upload an image / PDF / DOCX / text file, send
// it to POST /api/evidence, and show the extracted text. A short flag appears if
// the upload was too poor to read cleanly. (Summary/timeline come later.)
import { useCallback, useRef, useState } from "react";
import type { EvidenceExtract } from "@/lib/types";

type Result = EvidenceExtract & { indicativeNote?: string };

const ACCEPT =
  ".png,.jpg,.jpeg,.webp,.gif,.bmp,.tif,.tiff,.pdf,.docx,.txt,.md,.csv,image/*,application/pdf";

/** Read a File into a bare base64 string (no data: prefix). */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.onload = () => {
      const result = String(reader.result);
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.readAsDataURL(file);
  });
}

export default function EvidenceUploader() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const analyse = useCallback(async (file: File) => {
    setBusy(true);
    setError(null);
    setResult(null);
    setFileName(file.name);
    try {
      const fileBase64 = await fileToBase64(file);
      const res = await fetch("/api/evidence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileBase64,
          sourceFile: file.name,
          mimeType: file.type || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error ?? `Request failed (${res.status})`);
      }
      setResult(data as Result);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }, []);

  function downloadText() {
    if (!result) return;
    const blob = new Blob([result.extractedText], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${result.sourceFile.replace(/\.[^.]+$/, "")}-text.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const hasText = !!result?.extractedText?.trim();

  return (
    <div>
      <button
        className="btn btn-accent"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
      >
        {busy ? "Reading…" : "Choose a file"}
      </button>
      <span className="muted" style={{ marginLeft: "0.75rem", fontSize: "0.85rem" }}>
        Image, PDF, Word (.docx) or text — up to 15&nbsp;MB
      </span>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void analyse(file);
          e.target.value = "";
        }}
      />

      {busy && (
        <p className="muted" style={{ marginTop: "1rem" }}>
          Extracting text from <strong>{fileName}</strong>…
        </p>
      )}

      {error && (
        <div className="flag error" style={{ marginTop: "1rem" }}>
          <strong>Couldn&apos;t process that file.</strong>
          <div>{error}</div>
        </div>
      )}

      {result && (
        <div style={{ marginTop: "1.25rem" }}>
          {/* Quality flag — only when the upload wasn't clean enough */}
          {result.quality && !result.quality.sufficient && (
            <div className="flag" style={{ marginBottom: "1rem" }}>
              <strong>This file may not be clear enough.</strong>
              {result.quality.issues?.length > 0 && (
                <ul>
                  {result.quality.issues.map((iss, i) => (
                    <li key={i}>{iss}</li>
                  ))}
                </ul>
              )}
              {result.quality.recommendation && (
                <div style={{ marginTop: "0.4rem" }}>
                  <em>{result.quality.recommendation}</em>
                </div>
              )}
            </div>
          )}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              marginBottom: "0.5rem",
            }}
          >
            <p className="field-label" style={{ margin: 0, flex: 1 }}>
              Extracted text — {result.sourceFile}
            </p>
            {hasText && (
              <button className="btn" onClick={downloadText}>
                ↓ Download .txt
              </button>
            )}
          </div>

          {hasText ? (
            <pre className="transcript">{result.extractedText}</pre>
          ) : (
            <p className="muted">No text could be read from this file.</p>
          )}
        </div>
      )}
    </div>
  );
}
