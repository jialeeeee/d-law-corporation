"use client";

// Q&A view: rehearsal of likely tribunal questions. Two modes — a List of Q&A
// cards and a Flashcard practice deck. Questions are seeded from /api/qa-prep
// (generated from the included evidence). Statuses (new/review/confident) feed
// the readiness score.

import { useState } from "react";
import { useWorkspace } from "@/lib/store/WorkspaceProvider";
import { useUI, Icon } from "@/components/hearing-prep/ui";
import type { CaseData, QaItem, QaStatus } from "@/lib/store/types";
import { genId } from "@/lib/store/store";

// Shape posted to /api/qa-prep via the `evidence` array fallback.
interface QaEvidencePayload {
  sourceFile: string;
  kind: "image" | "document" | "audio";
  extractedText: string;
  transcript: string;
  summary: string;
  timeline: { date: string; description: string }[];
  dates: string[];
  amounts: string[];
  names: string[];
  language: string;
  needsTranslation: boolean;
  relevance: string;
  quality: { sufficient: boolean; confidence: number; issues: string[] };
  evidenceLinked: boolean;
}

interface QaPrepApiItem {
  question: string;
  answer: string;
  tip: string;
}

interface QaPrepApiResponse {
  items: QaPrepApiItem[];
  indicativeNote: string;
}

type Mode = "list" | "practice";

export function QaView() {
  const { activeCase, updateActive } = useWorkspace();
  const { setView, showToast } = useUI();

  const [mode, setMode] = useState<Mode>("list");
  const [index, setIndex] = useState(0);
  const [reveal, setReveal] = useState(false);
  const [loading, setLoading] = useState(false);

  const qa = activeCase.qa;

  const conf = qa.filter((q) => q.status === "confident").length;
  const review = qa.filter((q) => q.status === "review").length;
  const neww = qa.filter((q) => q.status === "new").length;

  function setStatus(id: string, status: QaStatus) {
    updateActive((cd: CaseData) => ({
      ...cd,
      qa: cd.qa.map((q) => (q.id === id ? { ...q, status } : q)),
    }));
  }

  function advance() {
    setIndex((i) => Math.min(qa.length - 1, i + 1));
    setReveal(false);
  }

  async function generateQa() {
    const inc = activeCase.evidence.filter((e) => e.included);
    if (inc.length === 0) {
      showToast("Add some evidence first", "info");
      setView("evidence");
      return;
    }

    setLoading(true);
    try {
      const payload: QaEvidencePayload[] = inc.map((e) => ({
        sourceFile: e.short,
        kind: e.kind,
        extractedText: e.extractedText ?? "",
        transcript: e.extractedText ?? "",
        summary: e.summary ?? e.note ?? "",
        timeline: e.timeline ?? [],
        dates: [],
        amounts: e.amounts ?? [],
        names: e.names ?? [],
        language: "English",
        needsTranslation: false,
        relevance: e.note ?? "",
        quality: { sufficient: true, confidence: 1, issues: [] },
        evidenceLinked: false,
      }));

      const res = await fetch("/api/qa-prep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ evidence: payload }),
      });
      if (!res.ok) {
        const detail = await res
          .json()
          .then((d: { error?: string }) => d.error)
          .catch(() => null);
        throw new Error(detail || `Request failed (${res.status})`);
      }
      const data = (await res.json()) as QaPrepApiResponse;

      const items: QaItem[] = (data.items ?? []).map((item, i) => ({
        id: genId(`q${i}`),
        q: item.question,
        a: item.answer,
        tip: item.tip,
        status: "new",
      }));

      updateActive((cd: CaseData) => ({ ...cd, qa: items }));
      setIndex(0);
      setReveal(false);
      showToast("Q&A generated", "quiz");
    } catch (err) {
      showToast(
        (err as Error)?.message || "Could not generate Q&A — try again",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }

  const segBtn = (m: Mode, label: string, icon: string) => {
    const active = mode === m;
    return (
      <button
        onClick={() => setMode(m)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 7,
          border: "none",
          cursor: "pointer",
          font: "inherit",
          fontWeight: 700,
          fontSize: 13.5,
          padding: "8px 16px",
          borderRadius: 10,
          background: active ? "var(--surface)" : "transparent",
          color: active ? "var(--ink)" : "var(--ink-soft)",
          boxShadow: active ? "var(--shadow-sm)" : "none",
        }}
      >
        <Icon name={icon} size={18} color={active ? "var(--teal)" : "var(--ink-mute)"} />
        {label}
      </button>
    );
  };

  // Status badge config (shared by list cards).
  const badge = (status: QaStatus) => {
    if (status === "confident")
      return { label: "Confident", icon: "task_alt", color: "var(--green)", bg: "var(--green-soft)" };
    if (status === "review")
      return { label: "Review", icon: "flag", color: "var(--amber)", bg: "var(--amber-soft)" };
    return { label: "Not yet", icon: "radio_button_unchecked", color: "var(--ink-mute)", bg: "var(--surface-2)" };
  };

  return (
    <div className="dl-view">
      {/* Header */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div>
          <div className="dl-eyebrow">Rehearsal</div>
          <h1 className="dl-h1">Likely questions &amp; answers</h1>
          <p className="dl-sub">
            {conf} confident · {review} to review · {neww} not started
          </p>
        </div>

        {qa.length > 0 && (
          <div
            style={{
              display: "inline-flex",
              gap: 4,
              background: "var(--surface-2)",
              borderRadius: 13,
              padding: 4,
            }}
          >
            {segBtn("list", "List", "list")}
            {segBtn("practice", "Flashcards", "style")}
          </div>
        )}
      </div>

      {/* Empty state */}
      {qa.length === 0 ? (
        <div
          className="dl-card"
          style={{ padding: "48px 24px", textAlign: "center" }}
        >
          <Icon name="quiz" size={44} color="var(--teal)" />
          <div style={{ fontSize: 18, fontWeight: 600, color: "var(--ink)", marginTop: 14 }}>
            No questions yet
          </div>
          <div style={{ fontSize: 14, color: "var(--ink-soft)", marginTop: 6, marginBottom: 22 }}>
            Generate the questions you are most likely to face from your included evidence.
          </div>
          <button
            className="dl-btn dl-btn-primary"
            onClick={generateQa}
            disabled={loading}
            style={{ margin: "0 auto" }}
          >
            {loading ? <span className="dl-spin" /> : <Icon name="auto_awesome" size={20} fill />}
            Generate likely Q&amp;A
          </button>
        </div>
      ) : mode === "list" ? (
        /* LIST MODE */
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(340px,1fr))",
            gap: 16,
          }}
        >
          {qa.map((item, i) => {
            const b = badge(item.status);
            return (
              <div key={item.id} className="dl-card" style={{ padding: 22 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 12,
                  }}
                >
                  <span
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 9,
                      background: "var(--surface-2)",
                      color: "var(--ink-soft)",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 800,
                      fontSize: 13,
                    }}
                  >
                    {i + 1}
                  </span>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      background: b.bg,
                      color: b.color,
                      borderRadius: 30,
                      padding: "5px 12px",
                      fontWeight: 700,
                      fontSize: 12,
                    }}
                  >
                    <Icon name={b.icon} size={15} fill={item.status !== "new"} color={b.color} />
                    {b.label}
                  </span>
                </div>

                <div
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: 18,
                    fontWeight: 600,
                    color: "var(--ink)",
                    lineHeight: 1.4,
                    marginBottom: 12,
                  }}
                >
                  {item.q}
                </div>

                <div
                  style={{
                    background: "var(--surface-2)",
                    borderRadius: 12,
                    padding: "12px 14px",
                    fontSize: 14,
                    color: "var(--ink)",
                    lineHeight: 1.55,
                  }}
                >
                  {item.a}
                </div>

                {item.tip && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 8,
                      marginTop: 12,
                      fontSize: 13,
                      color: "var(--ink-soft)",
                    }}
                  >
                    <Icon name="tips_and_updates" size={18} fill color="var(--amber)" />
                    <span>{item.tip}</span>
                  </div>
                )}

                <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                  <button
                    onClick={() => setStatus(item.id, "confident")}
                    style={{
                      flex: 1,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      height: 40,
                      borderRadius: 11,
                      border: "1px solid var(--line)",
                      cursor: "pointer",
                      font: "inherit",
                      fontWeight: 700,
                      fontSize: 13.5,
                      background: item.status === "confident" ? "var(--green)" : "var(--surface-2)",
                      color: item.status === "confident" ? "#fff" : "var(--ink)",
                    }}
                  >
                    <Icon
                      name="task_alt"
                      size={18}
                      fill={item.status === "confident"}
                      color={item.status === "confident" ? "#fff" : "var(--green)"}
                    />
                    Confident
                  </button>
                  <button
                    onClick={() => setStatus(item.id, "review")}
                    style={{
                      flex: 1,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      height: 40,
                      borderRadius: 11,
                      border: "1px solid var(--line)",
                      cursor: "pointer",
                      font: "inherit",
                      fontWeight: 700,
                      fontSize: 13.5,
                      background: item.status === "review" ? "var(--amber)" : "var(--surface-2)",
                      color: item.status === "review" ? "#fff" : "var(--ink)",
                    }}
                  >
                    <Icon
                      name="flag"
                      size={18}
                      fill={item.status === "review"}
                      color={item.status === "review" ? "#fff" : "var(--amber)"}
                    />
                    Review
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* FLASHCARD MODE */
        <FlashcardDeck
          qa={qa}
          index={index}
          reveal={reveal}
          conf={conf}
          onReveal={() => setReveal(true)}
          onPrev={() => {
            setIndex((i) => Math.max(0, i - 1));
            setReveal(false);
          }}
          onNext={() => {
            setIndex((i) => Math.min(qa.length - 1, i + 1));
            setReveal(false);
          }}
          onReview={() => {
            setStatus(qa[index].id, "review");
            advance();
          }}
          onConfident={() => {
            setStatus(qa[index].id, "confident");
            showToast("Marked confident", "task_alt");
            advance();
          }}
        />
      )}
    </div>
  );
}

function FlashcardDeck({
  qa,
  index,
  reveal,
  conf,
  onReveal,
  onPrev,
  onNext,
  onReview,
  onConfident,
}: {
  qa: QaItem[];
  index: number;
  reveal: boolean;
  conf: number;
  onReveal: () => void;
  onPrev: () => void;
  onNext: () => void;
  onReview: () => void;
  onConfident: () => void;
}) {
  const item = qa[index];
  const progress = qa.length ? ((index + 1) / qa.length) * 100 : 0;

  return (
    <div style={{ maxWidth: 680, margin: "0 auto" }}>
      {/* Progress header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
        }}
      >
        <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink-soft)" }}>
          Question {index + 1} of {qa.length}
        </span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "var(--green-soft)",
            color: "var(--green)",
            borderRadius: 30,
            padding: "4px 11px",
            fontWeight: 700,
            fontSize: 12.5,
          }}
        >
          <Icon name="task_alt" size={15} fill color="var(--green)" />
          {conf} mastered
        </span>
      </div>

      <div className="dl-track" style={{ marginBottom: 18 }}>
        <span style={{ width: `${progress}%` }} />
      </div>

      {/* Card */}
      <div
        className="dl-card"
        style={{
          minHeight: 300,
          padding: "30px 28px",
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        <div className="dl-eyebrow" style={{ marginBottom: 0 }}>
          THE TRIBUNAL ASKS
        </div>
        <div
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "clamp(22px,3vw,29px)",
            fontWeight: 600,
            color: "var(--ink)",
            lineHeight: 1.35,
          }}
        >
          {item.q}
        </div>

        {reveal ? (
          <div
            style={{
              animation: "dlFadeUp 0.35s cubic-bezier(0.16,1,0.3,1) both",
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <div
              style={{
                background: "var(--surface-2)",
                borderRadius: 14,
                padding: "16px 18px",
                fontSize: 15.5,
                color: "var(--ink)",
                lineHeight: 1.6,
              }}
            >
              {item.a}
            </div>
            {item.tip && (
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 9,
                  fontSize: 13.5,
                  color: "var(--ink-soft)",
                }}
              >
                <Icon name="tips_and_updates" size={19} fill color="var(--amber)" />
                <span>{item.tip}</span>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={onReveal}
            style={{
              marginTop: "auto",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              height: 52,
              borderRadius: 14,
              border: "1.5px dashed var(--teal)",
              background: "transparent",
              color: "var(--teal-strong)",
              cursor: "pointer",
              font: "inherit",
              fontWeight: 700,
              fontSize: 14.5,
            }}
          >
            <Icon name="visibility" size={20} color="var(--teal)" />
            Reveal answer
          </button>
        )}
      </div>

      {/* Footer controls */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginTop: 18,
        }}
      >
        <button
          className="dl-icon-btn"
          onClick={onPrev}
          disabled={index === 0}
          style={{ opacity: index === 0 ? 0.5 : 1 }}
          aria-label="Previous"
        >
          <Icon name="arrow_back" size={22} />
        </button>

        <button
          onClick={onReview}
          style={{
            flex: 1,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 7,
            height: 48,
            borderRadius: 13,
            border: "1px solid var(--amber)",
            background: "var(--amber-soft)",
            color: "var(--amber)",
            cursor: "pointer",
            font: "inherit",
            fontWeight: 700,
            fontSize: 14,
          }}
        >
          <Icon name="flag" size={19} fill color="var(--amber)" />
          Needs review
        </button>

        <button
          onClick={onConfident}
          style={{
            flex: 1,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 7,
            height: 48,
            borderRadius: 13,
            border: "none",
            background: "linear-gradient(140deg, var(--green), #0f9d6c)",
            color: "#fff",
            cursor: "pointer",
            font: "inherit",
            fontWeight: 700,
            fontSize: 14,
          }}
        >
          <Icon name="task_alt" size={19} fill color="#fff" />
          I&apos;m confident
        </button>

        <button
          className="dl-icon-btn"
          onClick={onNext}
          disabled={index === qa.length - 1}
          style={{ opacity: index === qa.length - 1 ? 0.5 : 1 }}
          aria-label="Next"
        >
          <Icon name="arrow_forward" size={22} />
        </button>
      </div>
    </div>
  );
}
