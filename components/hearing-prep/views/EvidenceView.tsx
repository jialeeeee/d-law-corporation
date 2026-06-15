"use client";

// Evidence view: upload files → call the real extraction APIs (/api/evidence for
// images/documents, /api/transcribe for audio) → store the resulting exhibits in
// the active case → browse / search / filter / include / remove them.
//
// The user has the final say on inclusion (agent.md §0.1): Agnes only *suggests*
// relevance; the include/exclude toggle decides what feeds the timeline + facts.

import { useCallback, useMemo, useRef, useState } from "react";
import { useWorkspace } from "@/lib/store/WorkspaceProvider";
import { useUI, Icon } from "@/components/hearing-prep/ui";
import type { CaseData, EvidenceItem, EvidenceType } from "@/lib/store/types";
import { genId, deriveTimeline, deriveFactGroups } from "@/lib/store/store";

// ─────────────────────────── API response typing ────────────────────────────
// The two endpoints return an EvidenceExtract or a Transcript plus an
// indicativeNote. We narrow defensively (no `any`) — only the fields we map.
interface ApiResponse {
  kind?: "image" | "document" | "audio";
  extractedText?: string;
  transcript?: string;
  summary?: string;
  timeline?: { date: string; description: string }[];
  amounts?: string[];
  names?: string[];
  needsTranslation?: boolean;
  relevance?: string;
  relevanceLevel?: "relevant" | "uncertain" | "irrelevant";
  quality?: { sufficient: boolean; issues: string[]; recommendation?: string };
  processingNote?: string;
  indicativeNote?: string;
  error?: string;
}

const AUDIO_EXT = [
  "mp3", "wav", "m4a", "aac", "ogg", "oga", "opus",
  "flac", "webm", "mp4", "mpeg", "mpga", "amr", "wma", "3gp",
];

const ACCEPT =
  ".png,.jpg,.jpeg,.webp,.gif,.bmp,.tif,.tiff,.heic,.heif,.avif," +
  ".pdf,.docx,.doc,.rtf,.txt,.md,.csv," +
  ".mp3,.wav,.m4a,.aac,.ogg,.oga,.opus,.flac,.webm,.amr,.wma," +
  "image/*,application/pdf,audio/*";

interface UploadStatus {
  id: string;
  name: string;
  status: "uploading" | "done" | "error";
  error?: string;
}

function isAudio(file: File): boolean {
  if (file.type.toLowerCase().startsWith("audio/")) return true;
  const ext = (/\.([a-z0-9]+)$/i.exec(file.name)?.[1] ?? "").toLowerCase();
  return AUDIO_EXT.includes(ext);
}

function fileExt(name: string): string {
  return (/\.([a-z0-9]+)$/i.exec(name)?.[1] ?? "").toLowerCase();
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

/** Pick the display type/icon/colour from the file kind + extension. */
function visualFor(
  kind: "image" | "document" | "audio",
  ext: string,
): { type: EvidenceType; icon: string; color: string } {
  if (kind === "audio") return { type: "Audio", icon: "graphic_eq", color: "var(--amber)" };
  if (kind === "image") return { type: "Image", icon: "image", color: "var(--teal)" };
  if (ext === "pdf") return { type: "PDF", icon: "receipt_long", color: "var(--rose)" };
  if (ext === "txt" || ext === "md" || ext === "csv") {
    return { type: "Chat", icon: "forum", color: "var(--green)" };
  }
  return { type: "Doc", icon: "description", color: "var(--ink-soft)" };
}

/** Simple category heuristic for the tag chip. */
function tagFor(kind: "image" | "document" | "audio", amounts?: string[]): string {
  if (amounts && amounts.length) return "Payment";
  if (kind === "audio" || kind === "document") return "Communications";
  return "Evidence";
}

export function EvidenceView() {
  const { activeCase, updateActive } = useWorkspace();
  const { showToast, openEvidence } = useUI();

  const [audioLang, setAudioLang] = useState("en");
  const [dragging, setDragging] = useState(false);
  const [uploads, setUploads] = useState<UploadStatus[]>([]);
  const [indicativeNote, setIndicativeNote] = useState("");
  const [evQuery, setEvQuery] = useState("");
  const [evFilter, setEvFilter] = useState("All");
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadingCount = uploads.filter((u) => u.status === "uploading").length;

  const setUpload = useCallback((id: string, patch: Partial<UploadStatus>) => {
    setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
  }, []);

  const handleFiles = useCallback(
    async (files: File[]) => {
      if (!files.length) return;
      const tracked: UploadStatus[] = files.map((f) => ({
        id: genId("up"),
        name: f.name,
        status: "uploading",
      }));
      setUploads((prev) => [...prev, ...tracked]);

      // Process each file independently so the grid fills in progressively and a
      // single failure never aborts the batch.
      await Promise.all(
        files.map(async (file, i) => {
          const trackId = tracked[i].id;
          try {
            let data: ApiResponse;
            if (isAudio(file)) {
              const form = new FormData();
              form.append("file", file);
              form.append("language", audioLang);
              const res = await fetch("/api/transcribe", { method: "POST", body: form });
              data = (await res.json()) as ApiResponse;
              if (!res.ok) throw new Error(data?.error ?? `Request failed (${res.status})`);
            } else {
              const base64 = await fileToBase64(file);
              const res = await fetch("/api/evidence", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  fileBase64: base64,
                  sourceFile: file.name,
                  mimeType: file.type || undefined,
                }),
              });
              data = (await res.json()) as ApiResponse;
              if (!res.ok) throw new Error(data?.error ?? `Request failed (${res.status})`);
            }

            const kind: "image" | "document" | "audio" =
              data.kind ?? (isAudio(file) ? "audio" : "document");
            const ext = fileExt(file.name);
            const visual = visualFor(kind, ext);
            const timeline = data.timeline ?? [];
            const firstDate = timeline[0]?.date;
            const relevanceLevel = data.relevanceLevel;

            const item: EvidenceItem = {
              id: genId("ev"),
              name: file.name,
              short: file.name,
              type: visual.type,
              icon: visual.icon,
              color: visual.color,
              meta: `${(file.size / 1024).toFixed(0)} KB`,
              date: firstDate ?? "Undated",
              dateISO: firstDate,
              tag: tagFor(kind, data.amounts),
              note: data.relevance || data.summary || "",
              kind,
              summary: data.summary,
              extractedText: data.extractedText ?? data.transcript ?? "",
              timeline,
              amounts: data.amounts,
              names: data.names,
              needsTranslation: data.needsTranslation,
              relevanceLevel,
              quality: data.quality,
              processingNote: data.processingNote,
              included: relevanceLevel !== "irrelevant",
            };

            if (data.indicativeNote) setIndicativeNote(data.indicativeNote);

            updateActive((c) => {
              const evidence = [...c.evidence, item];
              return {
                ...c,
                evidence,
                timeline: deriveTimeline(evidence),
                factGroups: deriveFactGroups(evidence),
              };
            });
            setUpload(trackId, { status: "done" });
          } catch (err) {
            const msg = err instanceof Error ? err.message : "Upload failed.";
            setUpload(trackId, { status: "error", error: msg });
            showToast(`${file.name}: ${msg}`, "error");
          }
        }),
      );
    },
    [audioLang, setUpload, showToast, updateActive],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      void handleFiles(Array.from(e.dataTransfer.files ?? []));
    },
    [handleFiles],
  );

  const toggleIncluded = useCallback(
    (id: string) => {
      updateActive((c) => {
        const evidence = c.evidence.map((e) =>
          e.id === id ? { ...e, included: !e.included } : e,
        );
        return {
          ...c,
          evidence,
          timeline: deriveTimeline(evidence),
          factGroups: deriveFactGroups(evidence),
        };
      });
    },
    [updateActive],
  );

  const removeItem = useCallback(
    (id: string) => {
      updateActive((c) => {
        const evidence = c.evidence.filter((e) => e.id !== id);
        return {
          ...c,
          evidence,
          timeline: deriveTimeline(evidence),
          factGroups: deriveFactGroups(evidence),
        };
      });
      showToast("Removed", "delete");
    },
    [showToast, updateActive],
  );

  // Unique tags across the case for the filter chips.
  const tags = useMemo(() => {
    const set = new Set<string>();
    activeCase.evidence.forEach((e) => set.add(e.tag));
    return ["All", ...Array.from(set)];
  }, [activeCase.evidence]);

  const filtered = useMemo(() => {
    const q = evQuery.trim().toLowerCase();
    return activeCase.evidence.filter((e) => {
      if (evFilter !== "All" && e.tag !== evFilter) return false;
      if (!q) return true;
      return (
        e.name.toLowerCase().includes(q) ||
        e.type.toLowerCase().includes(q) ||
        e.tag.toLowerCase().includes(q)
      );
    });
  }, [activeCase.evidence, evQuery, evFilter]);

  const hasEvidence = activeCase.evidence.length > 0;

  return (
    <div className="dl-view">
      {/* Header */}
      <div style={{ marginBottom: 22 }}>
        <div
          className="dl-eyebrow"
          style={{ color: "var(--teal)", fontSize: 13, fontWeight: 700 }}
        >
          Case file
        </div>
        <h1 className="dl-h1">Evidence &amp; exhibits</h1>
        <p className="dl-sub">
          {activeCase.evidence.length} files collected and labelled. Tap any item to
          preview its details.
        </p>
        {indicativeNote && (
          <p style={{ fontSize: 12.5, color: "var(--ink-mute)", margin: "6px 0 0", maxWidth: 640 }}>
            {indicativeNote}
          </p>
        )}
      </div>

      {/* Upload zone */}
      <div
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
        style={{
          border: `2px dashed ${dragging ? "var(--teal)" : "var(--line-strong)"}`,
          background: dragging ? "var(--teal-soft)" : "var(--surface-2)",
          borderRadius: 18,
          padding: "clamp(24px,3.5vw,40px) 24px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          gap: 10,
          cursor: "pointer",
          transition: "background .15s, border-color .15s",
          marginBottom: 22,
        }}
      >
        <Icon name="cloud_upload" size={42} color="var(--teal)" fill={dragging} />
        <div style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)" }}>
          Drag &amp; drop files or click to upload
        </div>
        <div style={{ fontSize: 13, color: "var(--ink-mute)", maxWidth: 460 }}>
          Supported: images, PDF, DOCX, TXT and audio. Each file is read by AI to
          extract its text and dated events.
        </div>

        <div
          onClick={(e) => e.stopPropagation()}
          style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6, flexWrap: "wrap", justifyContent: "center" }}
        >
          <label style={{ fontSize: 13, color: "var(--ink-soft)" }}>
            Spoken language for audio:
          </label>
          <select
            className="dl-field"
            value={audioLang}
            onChange={(e) => setAudioLang(e.target.value)}
            style={{ maxWidth: 200 }}
          >
            <option value="en">English</option>
            <option value="zh">Chinese</option>
            <option value="ms">Malay</option>
            <option value="ta">Tamil</option>
            <option value="">Auto-detect</option>
          </select>
        </div>

        {uploadingCount > 0 && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              color: "var(--ink-soft)",
              marginTop: 4,
            }}
          >
            <span className="dl-spin" />
            Reading {uploadingCount} file{uploadingCount === 1 ? "" : "s"}…
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          hidden
          onChange={(e) => {
            void handleFiles(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />
      </div>

      {/* Toolbar: search + filter chips (only once there is evidence) */}
      {hasEvidence && (
        <>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              height: 48,
              padding: "0 14px",
              background: "var(--surface-2)",
              border: "1px solid var(--line)",
              borderRadius: 13,
              marginBottom: 14,
            }}
          >
            <Icon name="search" size={21} color="var(--ink-mute)" />
            <input
              className="dl-input"
              value={evQuery}
              onChange={(e) => setEvQuery(e.target.value)}
              placeholder="Search by name, type or tag…"
              style={{ flex: 1, border: "none", background: "transparent", height: "100%" }}
            />
            {evQuery && (
              <button
                className="dl-icon-btn"
                onClick={() => setEvQuery("")}
                aria-label="Clear search"
              >
                <Icon name="close" size={18} color="var(--ink-mute)" />
              </button>
            )}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
            {tags.map((t) => (
              <button
                key={t}
                className={`dl-chip${evFilter === t ? " active" : ""}`}
                onClick={() => setEvFilter(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Content states */}
      {!hasEvidence ? (
        <div
          className="dl-card"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            padding: "clamp(36px,6vw,72px) 24px",
            textAlign: "center",
            color: "var(--ink-mute)",
          }}
        >
          <Icon name="cloud_upload" size={48} color="var(--ink-mute)" />
          <div style={{ fontFamily: "var(--font-serif)", fontSize: 22, color: "var(--ink)" }}>
            No evidence yet — upload your files to get started
          </div>
          <p style={{ fontSize: 14.5, color: "var(--ink-soft)", maxWidth: 400 }}>
            The AI will extract the text from each file and build a chronological
            timeline of dated events for your case.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="dl-card"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            padding: "clamp(36px,6vw,72px) 24px",
            textAlign: "center",
            color: "var(--ink-mute)",
          }}
        >
          <Icon name="search_off" size={48} color="var(--ink-mute)" />
          <div style={{ fontFamily: "var(--font-serif)", fontSize: 22, color: "var(--ink)" }}>
            No evidence matches your search
          </div>
          <button
            className="dl-btn"
            onClick={() => {
              setEvQuery("");
              setEvFilter("All");
            }}
          >
            <Icon name="restart_alt" size={18} />
            Clear search
          </button>
        </div>
      ) : (
        <div
          className="dl-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(258px,1fr))",
            gap: 16,
          }}
        >
          {filtered.map((e) => (
            <div
              key={e.id}
              className="dl-card dl-lift"
              onClick={() => openEvidence(e.id)}
              style={{
                padding: 18,
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                gap: 12,
                opacity: e.included ? 1 : 0.55,
              }}
            >
              {/* Top row: icon badge + type pill */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: 14,
                    background: "var(--surface-2)",
                    border: "1px solid var(--line)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon name={e.icon} size={24} color={e.color} fill />
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--ink-soft)",
                    background: "var(--surface-2)",
                    border: "1px solid var(--line)",
                    borderRadius: 7,
                    padding: "3px 8px",
                  }}
                >
                  {e.type}
                </span>
              </div>

              {/* Name + meta */}
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 15.5,
                    fontWeight: 700,
                    color: "var(--ink)",
                    wordBreak: "break-word",
                  }}
                >
                  {e.name}
                </div>
                <div style={{ fontSize: 13, color: "var(--ink-mute)", marginTop: 2 }}>
                  {e.meta}
                </div>
              </div>

              {/* Footer: tag chip + date */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  borderTop: "1px solid var(--line)",
                  paddingTop: 12,
                  marginTop: "auto",
                }}
              >
                <span
                  style={{
                    fontSize: 11.5,
                    fontWeight: 700,
                    color: "var(--teal-strong)",
                    background: "var(--teal-soft)",
                    borderRadius: 7,
                    padding: "3px 9px",
                  }}
                >
                  {e.tag}
                </span>
                <span style={{ fontSize: 12.5, color: "var(--ink-mute)" }}>{e.date}</span>
              </div>

              {/* Controls: include toggle + remove (don't open slide-over) */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <button
                  className="dl-btn"
                  onClick={(ev) => {
                    ev.stopPropagation();
                    toggleIncluded(e.id);
                  }}
                  style={{ height: 34, fontSize: 12.5 }}
                >
                  <Icon
                    name={e.included ? "check_box" : "check_box_outline_blank"}
                    size={18}
                    color={e.included ? "var(--teal)" : "var(--ink-mute)"}
                    fill={e.included}
                  />
                  {e.included ? "Included" : "Excluded"}
                </button>
                <button
                  className="dl-icon-btn"
                  onClick={(ev) => {
                    ev.stopPropagation();
                    removeItem(e.id);
                  }}
                  aria-label="Remove evidence"
                  title="Remove"
                >
                  <Icon name="delete" size={18} color="var(--rose)" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
