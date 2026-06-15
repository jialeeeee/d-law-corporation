"use client";

// Feature 2 — Evidence organiser UI (feat/evidence-docs).
//
// The user uploads ALL their evidence (images / PDFs / Word / text). Each file
// is sent to POST /api/evidence, where Agnes AI extracts the text and the dated
// events. We then merge every file's events into ONE chronological case
// timeline and let the user export a structured bundle (CaseEvidenceBundle) that
// the hearing-script track (F6) builds the court narrative from.
import { useCallback, useMemo, useRef, useState } from "react";
import type {
  CaseEvidenceBundle,
  EvidenceExtract,
  TimelineEvent,
} from "@/lib/types";

type Result = EvidenceExtract & { indicativeNote?: string };

interface Item {
  id: string;
  name: string;
  status: "processing" | "done" | "error";
  result?: Result;
  error?: string;
}

const ACCEPT =
  ".png,.jpg,.jpeg,.webp,.gif,.bmp,.tif,.tiff,.heic,.heif,.avif," +
  ".pdf,.docx,.doc,.rtf,.txt,.md,.csv,image/*,application/pdf";

/** Read a File into a bare base64 string (no data: prefix). */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.onload = () => {
      const r = String(reader.result);
      resolve(r.slice(r.indexOf(",") + 1));
    };
    reader.readAsDataURL(file);
  });
}

/** Best-effort parse of a free-text date into a sortable timestamp (D/M first). */
function parseDate(s?: string): number | null {
  if (!s) return null;
  // Prefer day/month/year (Singapore convention) for slash/dash dates.
  const m = s.match(/\b(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})\b/);
  if (m) {
    const day = +m[1];
    const mon = +m[2];
    const yr = m[3].length === 2 ? 2000 + +m[3] : +m[3];
    const dt = new Date(yr, mon - 1, day);
    if (!Number.isNaN(dt.getTime())) return dt.getTime();
  }
  const t = Date.parse(s); // handles "3 Jan 2026", ISO, etc.
  return Number.isNaN(t) ? null : t;
}

const uniq = (arr: string[]) =>
  [...new Set(arr.map((x) => x.trim()).filter(Boolean))];

/** Merge all files' events into one list ordered earliest → latest. */
function sortedTimeline(results: Result[]): TimelineEvent[] {
  const events = results.flatMap((r) => r.timeline ?? []);
  return events
    .map((e, i) => ({ e, i, t: parseDate(e.date) }))
    .sort((a, b) => {
      if (a.t === null && b.t === null) return a.i - b.i;
      if (a.t === null) return 1; // undated events sink to the bottom
      if (b.t === null) return -1;
      return a.t - b.t;
    })
    .map((x) => x.e);
}

export default function EvidenceUploader() {
  const [items, setItems] = useState<Item[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const update = useCallback(
    (id: string, patch: Partial<Item>) =>
      setItems((prev) =>
        prev.map((it) => (it.id === id ? { ...it, ...patch } : it)),
      ),
    [],
  );

  const addFiles = useCallback(
    async (files: File[]) => {
      const newItems: Item[] = files.map((f) => ({
        id: `${f.name}-${f.size}-${Date.now()}-${Math.random()}`,
        name: f.name,
        status: "processing",
      }));
      setItems((prev) => [...prev, ...newItems]);

      // Process sequentially to keep things gentle on the Agnes endpoint.
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const id = newItems[i].id;
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
          update(id, { status: "done", result: data as Result });
        } catch (err) {
          update(id, { status: "error", error: (err as Error).message });
        }
      }
    },
    [update],
  );

  const done = useMemo(
    () => items.filter((i) => i.status === "done" && i.result).map((i) => i.result!),
    [items],
  );
  const timeline = useMemo(() => sortedTimeline(done), [done]);
  const processing = items.some((i) => i.status === "processing");

  function buildBundle(): CaseEvidenceBundle {
    return {
      generatedAt: new Date().toISOString(),
      evidence: done.map(({ indicativeNote: _omit, ...e }) => e),
      timeline,
      entities: {
        dates: uniq(done.flatMap((r) => r.dates ?? [])),
        amounts: uniq(done.flatMap((r) => r.amounts ?? [])),
        names: uniq(done.flatMap((r) => r.names ?? [])),
      },
      indicativeNote: done[0]?.indicativeNote ?? "",
    };
  }

  function download(name: string, content: string, type: string) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadBundle() {
    download(
      "case-evidence.json",
      JSON.stringify(buildBundle(), null, 2),
      "application/json",
    );
  }

  function downloadTimeline() {
    const lines = timeline.map(
      (e) => `${e.date}\t${e.description}${e.sourceFile ? `  [${e.sourceFile}]` : ""}`,
    );
    download(
      "case-timeline.txt",
      `Case timeline (chronological)\n${"=".repeat(40)}\n\n${lines.join("\n")}\n`,
      "text/plain;charset=utf-8",
    );
  }

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const files = Array.from(e.dataTransfer.files ?? []);
      if (files.length) void addFiles(files);
    },
    [addFiles],
  );

  return (
    <div>
      {/* Upload zone (multiple files) */}
      <div
        className={`dropzone${dragging ? " drag" : ""}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
      >
        <strong>Drop your evidence here, or click to choose</strong>
        <div className="hint">
          Add as many files as you like — images, PDFs, Word (.docx), RTF or
          text. Agnes reads each one and builds your case timeline.
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          hidden
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            if (files.length) void addFiles(files);
            e.target.value = "";
          }}
        />
      </div>

      {/* Per-file status list */}
      {items.length > 0 && (
        <div style={{ marginTop: "1.25rem" }}>
          <p className="field-label">Files ({items.length})</p>
          {items.map((it) => (
            <FileRow key={it.id} item={it} />
          ))}
        </div>
      )}

      {/* Combined, chronological case timeline */}
      {done.length > 0 && (
        <div className="card" style={{ marginTop: "1.5rem" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              flexWrap: "wrap",
            }}
          >
            <h3 style={{ margin: 0, flex: 1 }}>
              Case timeline {processing ? "(building…)" : ""}
            </h3>
            <button className="btn" onClick={downloadTimeline}>
              ↓ Timeline (.txt)
            </button>
            <button className="btn btn-accent" onClick={downloadBundle}>
              ↓ Case data (.json)
            </button>
          </div>
          <p className="muted" style={{ marginTop: "0.35rem", fontSize: "0.85rem" }}>
            {timeline.length} event{timeline.length === 1 ? "" : "s"} from{" "}
            {done.length} file{done.length === 1 ? "" : "s"}, ordered earliest to
            latest. Export the case data for the hearing-script step.
          </p>

          {timeline.length > 0 ? (
            <ul className="timeline" style={{ marginTop: "1rem" }}>
              {timeline.map((e, i) => (
                <li key={i}>
                  <div className="date">{e.date}</div>
                  <div>{e.description}</div>
                  {e.sourceFile && (
                    <div className="muted" style={{ fontSize: "0.78rem" }}>
                      from {e.sourceFile}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No dated events were found in these files.</p>
          )}

          <EntityChips results={done} />
        </div>
      )}
    </div>
  );
}

function FileRow({ item }: { item: Item }) {
  const r = item.result;
  const ok = r?.quality?.sufficient;
  return (
    <details className="card" style={{ margin: "0.6rem 0" }}>
      <summary style={{ cursor: "pointer", display: "flex", gap: "0.6rem", alignItems: "center" }}>
        <span style={{ flex: 1, fontWeight: 600 }}>{item.name}</span>
        {item.status === "processing" && (
          <span className="badge">
            <span className="spinner" /> reading…
          </span>
        )}
        {item.status === "error" && <span className="badge badge-warn">⚠ failed</span>}
        {item.status === "done" && (
          <span className={`badge ${ok ? "badge-ok" : "badge-warn"}`}>
            {ok ? "✓ read" : "⚠ unclear"}
          </span>
        )}
      </summary>

      {item.status === "error" && (
        <div className="flag error" style={{ marginTop: "0.75rem" }}>
          {item.error}
        </div>
      )}

      {r && (
        <div style={{ marginTop: "0.75rem" }}>
          {!ok && (
            <div className="flag" style={{ marginBottom: "0.75rem" }}>
              <strong>This file may not be clear enough.</strong>
              {r.quality?.issues?.length > 0 && (
                <ul>
                  {r.quality.issues.map((iss, i) => (
                    <li key={i}>{iss}</li>
                  ))}
                </ul>
              )}
              {r.quality?.recommendation && (
                <div style={{ marginTop: "0.4rem" }}>
                  <em>{r.quality.recommendation}</em>
                </div>
              )}
            </div>
          )}
          {r.summary && (
            <>
              <p className="field-label">Summary</p>
              <p style={{ margin: "0 0 0.75rem" }}>{r.summary}</p>
            </>
          )}
          {r.extractedText && (
            <details>
              <summary style={{ cursor: "pointer", fontWeight: 600 }}>
                View extracted text
              </summary>
              <pre className="transcript">{r.extractedText}</pre>
            </details>
          )}
        </div>
      )}
    </details>
  );
}

function Chips({ label, items }: { label: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div style={{ marginTop: "0.75rem" }}>
      <p className="field-label">{label}</p>
      <div className="chips">
        {items.map((x, i) => (
          <span className="chip" key={`${x}-${i}`}>
            {x}
          </span>
        ))}
      </div>
    </div>
  );
}

function EntityChips({ results }: { results: Result[] }) {
  const dates = uniq(results.flatMap((r) => r.dates ?? []));
  const amounts = uniq(results.flatMap((r) => r.amounts ?? []));
  const names = uniq(results.flatMap((r) => r.names ?? []));
  if (!dates.length && !amounts.length && !names.length) return null;
  return (
    <div style={{ marginTop: "1rem" }}>
      <Chips label="Dates" items={dates} />
      <Chips label="Amounts" items={amounts} />
      <Chips label="People / businesses" items={names} />
    </div>
  );
}
