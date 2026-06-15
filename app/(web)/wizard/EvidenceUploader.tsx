"use client";

// Feature 2 — Evidence organiser UI (feat/evidence-docs).
//
// Upload ALL evidence (images / PDFs / Word / text / audio). Each file is sent
// to Agnes — documents & images via /api/evidence, audio via /api/transcribe —
// which extracts the text and dated events. Events from every INCLUDED file are
// merged into one chronological case timeline, exportable as the handoff bundle
// (CaseEvidenceBundle) the hearing-script track builds on.
//
// • The user decides what counts: Agnes only *suggests* relevance; an
//   include/exclude toggle gives the user the final say (agent.md §0.1).
// • Persistent: files + results are saved to localStorage so a page reload keeps
//   everything. Nothing is removed unless the user deletes it.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  CaseEvidenceBundle,
  EvidenceExtract,
  RelevanceLevel,
  TimelineEvent,
  Transcript,
} from "@/lib/types";

const STORAGE_KEY = "justifi.evidence.v1";

const ACCEPT =
  ".png,.jpg,.jpeg,.webp,.gif,.bmp,.tif,.tiff,.heic,.heif,.avif," +
  ".pdf,.docx,.doc,.rtf,.txt,.md,.csv," +
  ".mp3,.wav,.m4a,.aac,.ogg,.oga,.opus,.flac,.webm,.amr,.wma," +
  "image/*,application/pdf,audio/*";

const AUDIO_EXT = [
  "mp3", "wav", "m4a", "aac", "ogg", "oga", "opus",
  "flac", "webm", "mp4", "mpeg", "mpga", "amr", "wma", "3gp",
];

/** Normalised per-file result the UI renders (covers documents/images/audio). */
interface Extracted {
  sourceFile: string;
  kind: "image" | "document" | "audio";
  text: string;
  summary: string;
  timeline: TimelineEvent[];
  dates: string[];
  amounts: string[];
  names: string[];
  language: string;
  needsTranslation: boolean;
  relevance: string;
  relevanceLevel?: RelevanceLevel;
  /** Legibility flag (documents/images only). */
  quality?: EvidenceExtract["quality"];
  processingNote?: string;
  indicativeNote?: string;
}

interface Item {
  id: string;
  name: string;
  status: "processing" | "done" | "error";
  included: boolean;
  result?: Extracted;
  error?: string;
}

function isAudio(file: File): boolean {
  if (file.type.toLowerCase().startsWith("audio/")) return true;
  const ext = (/\.([a-z0-9]+)$/i.exec(file.name)?.[1] ?? "").toLowerCase();
  return AUDIO_EXT.includes(ext);
}

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

function mapEvidence(d: EvidenceExtract & { indicativeNote?: string }): Extracted {
  return {
    sourceFile: d.sourceFile,
    kind: d.kind,
    text: d.extractedText ?? "",
    summary: d.summary ?? "",
    timeline: d.timeline ?? [],
    dates: d.dates ?? [],
    amounts: d.amounts ?? [],
    names: d.names ?? [],
    language: d.language ?? "Unknown",
    needsTranslation: !!d.needsTranslation,
    relevance: d.relevance ?? "",
    relevanceLevel: d.relevanceLevel,
    quality: d.quality,
    processingNote: d.processingNote,
    indicativeNote: d.indicativeNote,
  };
}

function mapTranscript(d: Transcript & { indicativeNote?: string }): Extracted {
  return {
    sourceFile: d.sourceFile,
    kind: "audio",
    text: d.transcript ?? "",
    summary: d.summary ?? "",
    timeline: d.timeline ?? [],
    dates: d.dates ?? [],
    amounts: d.amounts ?? [],
    names: d.names ?? [],
    language: d.language ?? "Unknown",
    needsTranslation: !!d.needsTranslation,
    relevance: d.relevance ?? "",
    relevanceLevel: d.relevanceLevel,
    processingNote: d.processingNote,
    indicativeNote: d.indicativeNote,
  };
}

/** Best-effort parse of a free-text date to a sortable timestamp (D/M first). */
function parseDate(s?: string): number | null {
  if (!s) return null;
  const m = s.match(/\b(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})\b/);
  if (m) {
    const yr = m[3].length === 2 ? 2000 + +m[3] : +m[3];
    const dt = new Date(yr, +m[2] - 1, +m[1]);
    if (!Number.isNaN(dt.getTime())) return dt.getTime();
  }
  const t = Date.parse(s);
  return Number.isNaN(t) ? null : t;
}

const uniq = (arr: string[]) =>
  [...new Set(arr.map((x) => x.trim()).filter(Boolean))];

function sortedTimeline(results: Extracted[]): TimelineEvent[] {
  return results
    .flatMap((r) => r.timeline ?? [])
    .map((e, i) => ({ e, i, t: parseDate(e.date) }))
    .sort((a, b) => {
      if (a.t === null && b.t === null) return a.i - b.i;
      if (a.t === null) return 1;
      if (b.t === null) return -1;
      return a.t - b.t;
    })
    .map((x) => x.e);
}

export default function EvidenceUploader() {
  const [items, setItems] = useState<Item[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load persisted items on mount (client only — avoids hydration mismatch).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw) as Item[]);
    } catch {
      /* ignore corrupt storage */
    }
    setLoaded(true);
  }, []);

  // Persist whenever items change (skip in-flight 'processing' entries).
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(items.filter((i) => i.status !== "processing")),
      );
    } catch {
      /* quota exceeded — keep working in memory */
    }
  }, [items, loaded]);

  const update = useCallback(
    (id: string, patch: Partial<Item>) =>
      setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it))),
    [],
  );

  const addFiles = useCallback(
    async (files: File[]) => {
      const newItems: Item[] = files.map((f) => ({
        id: `${f.name}-${f.size}-${Date.now()}-${Math.random()}`,
        name: f.name,
        status: "processing",
        included: true,
      }));
      setItems((prev) => [...prev, ...newItems]);

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const id = newItems[i].id;
        try {
          const base64 = await fileToBase64(file);
          let result: Extracted;
          if (isAudio(file)) {
            const res = await fetch("/api/transcribe", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                audioBase64: base64,
                sourceFile: file.name,
                mimeType: file.type || undefined,
              }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error ?? `Request failed (${res.status})`);
            result = mapTranscript(data);
          } else {
            const res = await fetch("/api/evidence", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                fileBase64: base64,
                sourceFile: file.name,
                mimeType: file.type || undefined,
              }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error ?? `Request failed (${res.status})`);
            result = mapEvidence(data);
          }
          // Default: include unless Agnes suggests it's irrelevant.
          update(id, {
            status: "done",
            result,
            included: result.relevanceLevel !== "irrelevant",
          });
        } catch (err) {
          update(id, { status: "error", error: (err as Error).message });
        }
      }
    },
    [update],
  );

  const remove = useCallback(
    (id: string) => setItems((prev) => prev.filter((i) => i.id !== id)),
    [],
  );
  const clearAll = useCallback(() => {
    if (confirm("Remove all uploaded files and results?")) setItems([]);
  }, []);

  // Only INCLUDED, successfully-processed files feed the timeline + export.
  const included = useMemo(
    () => items.filter((i) => i.status === "done" && i.included && i.result).map((i) => i.result!),
    [items],
  );
  const timeline = useMemo(() => sortedTimeline(included), [included]);
  const processing = items.some((i) => i.status === "processing");

  function buildBundle(): CaseEvidenceBundle {
    return {
      generatedAt: new Date().toISOString(),
      evidence: included.map((r) => ({
        sourceFile: r.sourceFile,
        kind: r.kind === "audio" ? "document" : r.kind,
        extractedText: r.text,
        summary: r.summary,
        timeline: r.timeline,
        dates: r.dates,
        amounts: r.amounts,
        names: r.names,
        language: r.language,
        needsTranslation: r.needsTranslation,
        relevance: r.relevance,
        relevanceLevel: r.relevanceLevel,
        quality: r.quality ?? { sufficient: true, confidence: 1, issues: [] },
        evidenceLinked: false,
      })),
      timeline,
      entities: {
        dates: uniq(included.flatMap((r) => r.dates ?? [])),
        amounts: uniq(included.flatMap((r) => r.amounts ?? [])),
        names: uniq(included.flatMap((r) => r.names ?? [])),
      },
      indicativeNote: included[0]?.indicativeNote ?? "",
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
          Images, PDFs, Word (.docx), text or audio (mp3/wav/m4a…). Add as many
          as you like — Agnes reads each one and builds your case timeline.
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

      {items.length > 0 && (
        <div style={{ marginTop: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <p className="field-label" style={{ margin: 0, flex: 1 }}>
              Files ({items.length})
            </p>
            <button className="btn" onClick={clearAll}>
              Clear all
            </button>
          </div>
          {items.map((it) => (
            <FileRow
              key={it.id}
              item={it}
              onRemove={() => remove(it.id)}
              onToggle={() => update(it.id, { included: !it.included })}
            />
          ))}
        </div>
      )}

      {included.length > 0 && (
        <div className="card" style={{ marginTop: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
            <h3 style={{ margin: 0, flex: 1 }}>
              Case timeline {processing ? "(building…)" : ""}
            </h3>
            <button
              className="btn"
              onClick={() => {
                const lines = timeline.map(
                  (e) =>
                    `${e.date}\t${e.description}${e.sourceFile ? `  [${e.sourceFile}]` : ""}`,
                );
                download(
                  "case-timeline.txt",
                  `Case timeline (chronological)\n${"=".repeat(40)}\n\n${lines.join("\n")}\n`,
                  "text/plain;charset=utf-8",
                );
              }}
            >
              ↓ Timeline (.txt)
            </button>
            <button
              className="btn btn-accent"
              onClick={() =>
                download(
                  "case-evidence.json",
                  JSON.stringify(buildBundle(), null, 2),
                  "application/json",
                )
              }
            >
              ↓ Case data (.json)
            </button>
          </div>
          <p className="muted" style={{ marginTop: "0.35rem", fontSize: "0.85rem" }}>
            {timeline.length} event{timeline.length === 1 ? "" : "s"} from{" "}
            {included.length} included file{included.length === 1 ? "" : "s"},
            ordered earliest to latest.
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
            <p className="muted">No dated events were found in the included files.</p>
          )}

          <EntityChips results={included} />
        </div>
      )}
    </div>
  );
}

const KIND_LABEL: Record<Extracted["kind"], string> = {
  image: "Image",
  document: "Document",
  audio: "Audio",
};

const REL_BADGE: Record<RelevanceLevel, { label: string; cls: string }> = {
  relevant: { label: "✓ relevant", cls: "badge-ok" },
  uncertain: { label: "? uncertain", cls: "badge-warn" },
  irrelevant: { label: "✕ looks irrelevant", cls: "badge-warn" },
};

function FileRow({
  item,
  onRemove,
  onToggle,
}: {
  item: Item;
  onRemove: () => void;
  onToggle: () => void;
}) {
  const r = item.result;
  const unreadable = r?.quality && r.quality.sufficient === false;
  return (
    <div className="card" style={{ margin: "0.6rem 0", opacity: item.included ? 1 : 0.6 }}>
      <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ flex: 1, fontWeight: 600, wordBreak: "break-word" }}>{item.name}</span>
        {r && <span className="badge">{KIND_LABEL[r.kind]}</span>}
        {item.status === "processing" && (
          <span className="badge">
            <span className="spinner" /> reading…
          </span>
        )}
        {item.status === "error" && <span className="badge badge-warn">⚠ failed</span>}
        {item.status === "done" && r?.relevanceLevel && (
          <span className={`badge ${REL_BADGE[r.relevanceLevel].cls}`}>
            {REL_BADGE[r.relevanceLevel].label}
          </span>
        )}
        <button className="btn" onClick={onRemove} title="Remove this file">
          Remove
        </button>
      </div>

      {item.status === "done" && (
        <label style={{ display: "inline-flex", gap: "0.4rem", alignItems: "center", marginTop: "0.6rem", fontSize: "0.9rem" }}>
          <input type="checkbox" checked={item.included} onChange={onToggle} />
          Include in case timeline
        </label>
      )}

      {item.status === "error" && (
        <div className="flag error" style={{ marginTop: "0.75rem" }}>
          {item.error}
        </div>
      )}

      {r && (
        <div style={{ marginTop: "0.75rem" }}>
          {unreadable && (
            <div className="flag" style={{ marginBottom: "0.75rem" }}>
              <strong>This file may not be clear enough to read.</strong>
              {r.quality?.issues && r.quality.issues.length > 0 && (
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

          {r.needsTranslation && (
            <div className="flag" style={{ marginBottom: "0.75rem" }}>
              Not in English — the SCT requires an English translation to be
              submitted with this.
            </div>
          )}

          {r.processingNote && (
            <p className="muted" style={{ marginTop: 0 }}>
              {r.processingNote}
            </p>
          )}

          {r.relevance && (
            <p className="muted" style={{ marginTop: 0 }}>
              <strong>Relevance:</strong> {r.relevance}
            </p>
          )}

          {r.summary && (
            <>
              <p className="field-label">Summary</p>
              <p style={{ margin: "0 0 0.9rem" }}>{r.summary}</p>
            </>
          )}

          <p className="field-label">
            {r.kind === "audio"
              ? "Transcript"
              : r.kind === "image"
                ? "Extracted text (read from image)"
                : "Extracted text"}
          </p>
          {r.text ? (
            <pre className="transcript">{r.text}</pre>
          ) : (
            <p className="muted" style={{ margin: 0 }}>
              No text could be read from this file.
            </p>
          )}
        </div>
      )}
    </div>
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

function EntityChips({ results }: { results: Extracted[] }) {
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
