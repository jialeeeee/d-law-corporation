"use client";

import { useEffect, useState } from "react";
import type {
  CaseEvidenceBundle,
  EvidenceExtract,
  HearingScript,
  MockQAExchange,
  RelevanceLevel,
  TimelineEvent,
} from "@/lib/types";
import type { MockQATurnExtended } from "@/app/api/mock-qa/route";

// ── Read evidence from localStorage (same key as EvidenceUploader) ──────────

const STORAGE_KEY = "justifi.evidence.v1";

interface StoredExtracted {
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
  quality?: EvidenceExtract["quality"];
  indicativeNote?: string;
}

interface StoredItem {
  id: string;
  name: string;
  status: "processing" | "done" | "error";
  included: boolean;
  result?: StoredExtracted;
}

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

function buildBundle(items: StoredItem[]): CaseEvidenceBundle {
  const included = items
    .filter((i) => i.status === "done" && i.included && i.result)
    .map((i) => i.result!);

  const timeline: TimelineEvent[] = included
    .flatMap((r) => r.timeline ?? [])
    .map((e, i) => ({ e, i, t: parseDate(e.date) }))
    .sort((a, b) => {
      if (a.t === null && b.t === null) return a.i - b.i;
      if (a.t === null) return 1;
      if (b.t === null) return -1;
      return a.t - b.t;
    })
    .map((x) => x.e);

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

// ── Main component ──────────────────────────────────────────────────────────

export default function HearingPrep() {
  const [bundle, setBundle] = useState<CaseEvidenceBundle | null>(null);
  const [noEvidence, setNoEvidence] = useState(false);

  // Hearing script state
  const [script, setScript] = useState<HearingScript | null>(null);
  const [scriptLoading, setScriptLoading] = useState(false);
  const [scriptError, setScriptError] = useState<string | null>(null);

  // Mock Q&A state
  const [history, setHistory] = useState<MockQAExchange[]>([]);
  const [currentTurn, setCurrentTurn] = useState<MockQATurnExtended | null>(null);
  const [userAnswer, setUserAnswer] = useState("");
  const [qaLoading, setQaLoading] = useState(false);
  const [qaError, setQaError] = useState<string | null>(null);
  const [qaDone, setQaDone] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) { setNoEvidence(true); return; }
      const items = JSON.parse(raw) as StoredItem[];
      const b = buildBundle(items);
      if (b.evidence.length === 0) { setNoEvidence(true); return; }
      setBundle(b);
    } catch {
      setNoEvidence(true);
    }
  }, []);

  // ── Hearing Script ────────────────────────────────────────────────────────

  async function generateScript() {
    if (!bundle) return;
    setScriptLoading(true);
    setScriptError(null);
    setScript(null);
    try {
      const res = await fetch("/api/hearing-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bundle }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? `Request failed (${res.status})`);
      setScript(data as HearingScript);
    } catch (err) {
      setScriptError((err as Error).message);
    } finally {
      setScriptLoading(false);
    }
  }

  // ── Mock Q&A ─────────────────────────────────────────────────────────────

  async function fetchNextTurn(newHistory: MockQAExchange[]) {
    if (!bundle) return;
    setQaLoading(true);
    setQaError(null);
    try {
      const res = await fetch("/api/mock-qa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bundle, history: newHistory }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? `Request failed (${res.status})`);
      const turn = data as MockQATurnExtended;
      setCurrentTurn(turn);
      if (turn.done) setQaDone(true);
    } catch (err) {
      setQaError((err as Error).message);
    } finally {
      setQaLoading(false);
    }
  }

  function startQA() {
    setHistory([]);
    setCurrentTurn(null);
    setUserAnswer("");
    setQaDone(false);
    void fetchNextTurn([]);
  }

  function submitAnswer() {
    if (!currentTurn || !userAnswer.trim()) return;
    const newHistory: MockQAExchange[] = [
      ...history,
      { question: currentTurn.question, answer: userAnswer.trim() },
    ];
    setHistory(newHistory);
    setUserAnswer("");
    void fetchNextTurn(newHistory);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (noEvidence) {
    return (
      <div className="card">
        <p className="muted">
          No evidence found. Go to Step 1 and upload your documents or audio
          first — once Agnes has processed them, your hearing script and mock
          Q&A will be available here.
        </p>
      </div>
    );
  }

  if (!bundle) {
    return <p className="muted">Loading evidence…</p>;
  }

  return (
    <div>
      {/* Timeline summary */}
      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <h4 style={{ margin: "0 0 0.5rem" }}>
          Evidence loaded — {bundle.timeline.length} timeline event
          {bundle.timeline.length === 1 ? "" : "s"} from {bundle.evidence.length} file
          {bundle.evidence.length === 1 ? "" : "s"}
        </h4>
        {bundle.timeline.length > 0 && (
          <ul className="timeline" style={{ marginTop: "0.75rem" }}>
            {bundle.timeline.map((e, i) => (
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
        )}
      </div>

      {/* ── Hearing Script ── */}
      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          <h3 style={{ margin: 0, flex: 1 }}>Hearing Script</h3>
          <button
            className="btn btn-accent"
            onClick={generateScript}
            disabled={scriptLoading}
          >
            {scriptLoading ? "Generating…" : script ? "Regenerate" : "Generate Script"}
          </button>
        </div>
        <p className="muted" style={{ marginTop: "0.35rem", fontSize: "0.85rem" }}>
          Agnes reads your evidence timeline and writes a court-ready hearing
          script — opening statement, chronology tied to your evidence, and
          the exact relief you are seeking.
        </p>

        {scriptError && (
          <div className="flag error" style={{ marginTop: "0.75rem" }}>
            {scriptError}
          </div>
        )}

        {script && (
          <div style={{ marginTop: "1.25rem" }}>
            <p className="field-label">Opening statement</p>
            <p style={{ margin: "0 0 1rem", lineHeight: 1.7 }}>{script.opening}</p>

            <p className="field-label">Chronology</p>
            {script.chronology.map((s, i) => (
              <div
                key={i}
                style={{
                  borderLeft: "3px solid var(--accent, #6366f1)",
                  paddingLeft: "1rem",
                  marginBottom: "0.9rem",
                }}
              >
                <strong>{s.heading}</strong>
                <p style={{ margin: "0.3rem 0 0", lineHeight: 1.6 }}>{s.content}</p>
                {s.evidenceRefs && s.evidenceRefs.length > 0 && (
                  <p className="muted" style={{ margin: "0.25rem 0 0", fontSize: "0.8rem" }}>
                    Evidence: {s.evidenceRefs.join(", ")}
                  </p>
                )}
              </div>
            ))}

            <p className="field-label">Relief sought</p>
            <p style={{ margin: "0 0 1rem", lineHeight: 1.7 }}>{script.reliefSought}</p>

            <div className="flag" style={{ fontSize: "0.82rem" }}>
              {script.indicativeNote}
            </div>
          </div>
        )}
      </div>

      {/* ── Mock Q&A ── */}
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          <h3 style={{ margin: 0, flex: 1 }}>Mock Q&amp;A</h3>
          <button
            className="btn btn-accent"
            onClick={startQA}
            disabled={qaLoading}
          >
            {currentTurn ? "Restart" : "Start Mock Q&A"}
          </button>
        </div>
        <p className="muted" style={{ marginTop: "0.35rem", fontSize: "0.85rem" }}>
          Practice answering questions from both the Tribunal Magistrate and
          the opposing party. Agnes gives feedback on your answers and suggests
          stronger responses.
        </p>

        {qaError && (
          <div className="flag error" style={{ marginTop: "0.75rem" }}>
            {qaError}
          </div>
        )}

        {/* Past exchanges */}
        {history.length > 0 && (
          <div style={{ marginTop: "1.25rem" }}>
            <p className="field-label">Previous exchanges</p>
            {history.map((ex, i) => (
              <div
                key={i}
                style={{
                  background: "var(--bg-card, #f8f8f8)",
                  border: "1px solid var(--border, #e0e0e0)",
                  borderRadius: 8,
                  padding: "0.75rem 1rem",
                  marginBottom: "0.6rem",
                  fontSize: "0.9rem",
                }}
              >
                <p style={{ margin: "0 0 0.4rem", fontWeight: 600 }}>
                  Q{i + 1}: {ex.question}
                </p>
                <p style={{ margin: 0, color: "var(--muted, #666)" }}>
                  Your answer: {ex.answer}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Current turn */}
        {currentTurn && !qaDone && (
          <div style={{ marginTop: "1.25rem" }}>
            {/* Feedback on last answer */}
            {currentTurn.feedbackOnLastAnswer && (
              <div
                style={{
                  background: "var(--bg-card, #f8f8f8)",
                  border: "1px solid var(--border, #e0e0e0)",
                  borderRadius: 8,
                  padding: "0.75rem 1rem",
                  marginBottom: "1rem",
                  fontSize: "0.9rem",
                }}
              >
                <p className="field-label" style={{ margin: "0 0 0.35rem" }}>
                  Feedback on your last answer
                </p>
                <p style={{ margin: 0, lineHeight: 1.6 }}>
                  {currentTurn.feedbackOnLastAnswer}
                </p>
              </div>
            )}

            {/* Current question */}
            <div
              style={{
                borderLeft: "3px solid var(--accent, #6366f1)",
                paddingLeft: "1rem",
                marginBottom: "1rem",
              }}
            >
              <p className="field-label" style={{ margin: "0 0 0.25rem" }}>
                {currentTurn.questionFrom === "magistrate"
                  ? "Tribunal Magistrate asks:"
                  : "Opposing party asks:"}
              </p>
              <p style={{ margin: 0, fontSize: "1rem", fontWeight: 600, lineHeight: 1.6 }}>
                {currentTurn.question}
              </p>
            </div>

            {/* Recommended answer */}
            <div
              style={{
                background: "var(--bg-card, #f0f7f0)",
                border: "1px solid #b7ddb7",
                borderRadius: 8,
                padding: "0.75rem 1rem",
                marginBottom: "1rem",
                fontSize: "0.9rem",
              }}
            >
              <p className="field-label" style={{ margin: "0 0 0.35rem" }}>
                Suggested answer
              </p>
              <p style={{ margin: 0, lineHeight: 1.6 }}>
                {currentTurn.recommendedAnswer}
              </p>
            </div>

            {/* Tips */}
            {currentTurn.tips.length > 0 && (
              <div style={{ marginBottom: "1rem", fontSize: "0.88rem" }}>
                <p className="field-label" style={{ margin: "0 0 0.35rem" }}>Tips</p>
                <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
                  {currentTurn.tips.map((tip, i) => (
                    <li key={i} style={{ marginBottom: "0.25rem", color: "var(--muted, #555)" }}>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* User answer input */}
            <p className="field-label">Your answer</p>
            <textarea
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              placeholder="Type your answer here…"
              rows={3}
              style={{
                width: "100%",
                padding: "0.6rem 0.75rem",
                borderRadius: 8,
                border: "1px solid var(--border, #ccc)",
                background: "var(--bg, #fff)",
                color: "var(--text, #000)",
                fontSize: "0.95rem",
                lineHeight: 1.5,
                resize: "vertical",
                boxSizing: "border-box",
              }}
            />
            <button
              className="btn btn-accent"
              style={{ marginTop: "0.75rem" }}
              onClick={submitAnswer}
              disabled={qaLoading || !userAnswer.trim()}
            >
              {qaLoading ? "Thinking…" : "Submit answer →"}
            </button>
          </div>
        )}

        {/* Session complete */}
        {qaDone && currentTurn && (
          <div style={{ marginTop: "1.25rem" }}>
            {currentTurn.feedbackOnLastAnswer && (
              <div
                style={{
                  background: "var(--bg-card, #f8f8f8)",
                  border: "1px solid var(--border, #e0e0e0)",
                  borderRadius: 8,
                  padding: "0.75rem 1rem",
                  marginBottom: "1rem",
                  fontSize: "0.9rem",
                }}
              >
                <p className="field-label" style={{ margin: "0 0 0.35rem" }}>
                  Feedback on your last answer
                </p>
                <p style={{ margin: 0 }}>{currentTurn.feedbackOnLastAnswer}</p>
              </div>
            )}
            <div className="flag" style={{ fontSize: "0.9rem" }}>
              <strong>Session complete.</strong> You have covered the key areas.
              Restart anytime to practise again.
            </div>
            <div className="flag" style={{ fontSize: "0.82rem", marginTop: "0.75rem" }}>
              {currentTurn.indicativeNote}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
