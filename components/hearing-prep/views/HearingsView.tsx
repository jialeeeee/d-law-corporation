"use client";

// Hearings view: the "what you'll say" screen. Countdown + hearing meta stat
// row, a teleprompter-style hearing script (generated via /api/hearing-script
// from the included evidence), the hearing-day checklist, and a tip callout.

import { useState } from "react";
import { useWorkspace } from "@/lib/store/WorkspaceProvider";
import { useUI, Icon } from "@/components/hearing-prep/ui";
import type { CaseData, ScriptSection } from "@/lib/store/types";
import { readiness, deriveEntities, deriveTimeline } from "@/lib/store/store";
import type { HearingScript } from "@/lib/types";

// Shape posted to /api/hearing-script via the `evidence` array fallback.
interface ScriptEvidencePayload {
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

export function HearingsView() {
  const { activeCase, updateActive } = useWorkspace();
  const { setView, showToast } = useUI();
  const [loading, setLoading] = useState(false);

  const c = activeCase.meta;
  const r = readiness(activeCase);
  const sections = activeCase.scriptSections;

  const days = c.hearingISO
    ? Math.max(0, Math.ceil((new Date(c.hearingISO).getTime() - Date.now()) / 86400000))
    : null;

  const checklist = activeCase.checklist;
  const doneCount = checklist.filter((x) => x.done).length;
  const pct = checklist.length ? Math.round((doneCount / checklist.length) * 100) : 0;

  const navyGrad = "linear-gradient(150deg, var(--navy-2), var(--navy))";

  async function generateScript() {
    const inc = activeCase.evidence.filter((e) => e.included);
    if (inc.length === 0) {
      showToast("Add some evidence first", "info");
      setView("evidence");
      return;
    }

    setLoading(true);
    try {
      const payload: ScriptEvidencePayload[] = inc.map((e) => ({
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

      const res = await fetch("/api/hearing-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ evidence: payload }),
      });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const script = (await res.json()) as HearingScript;

      const secs: ScriptSection[] = [
        { id: "s1", tag: "Introduction", lines: [script.opening] },
        ...script.chronology.map((s, i) => ({
          id: `s${i + 2}`,
          tag: s.heading,
          lines: [s.content],
        })),
        { id: "sR", tag: "The relief I am seeking", lines: [script.reliefSought] },
      ];

      updateActive((cd: CaseData) => ({
        ...cd,
        scriptSections: secs,
        hearingScript: script,
        scriptReviewed: false,
      }));
      showToast("Script generated", "menu_book");
    } catch {
      showToast("Could not generate the script — try again", "error");
    } finally {
      setLoading(false);
    }
  }

  // Used by the bundle-style generate path (entities/timeline derivation kept
  // available for parity with the shared contract).
  void deriveEntities;
  void deriveTimeline;

  const tagChip = (tag: string) => (
    <span
      style={{
        display: "inline-block",
        textTransform: "uppercase",
        letterSpacing: ".06em",
        fontSize: 11,
        fontWeight: 700,
        background: "var(--surface-2)",
        color: "var(--teal-strong)",
        borderRadius: 8,
        padding: "5px 11px",
        marginBottom: 10,
      }}
    >
      {tag}
    </span>
  );

  return (
    <div className="dl-view">
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div className="dl-eyebrow">Hearing day</div>
        <h1 className="dl-h1">Prepare what you&apos;ll say</h1>
        <p className="dl-sub">
          Read your script aloud, then tick off everything you need on the day.
        </p>
      </div>

      {/* Stat row */}
      <div
        className="dl-grid"
        style={{
          gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
          marginBottom: 18,
        }}
      >
        {/* Countdown */}
        <div
          className="dl-card"
          style={{ padding: 20, background: navyGrad, border: "none", color: "#fff" }}
        >
          <div style={{ fontSize: 12.5, fontWeight: 700, opacity: 0.85, letterSpacing: ".04em" }}>
            Countdown
          </div>
          <div
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 44,
              fontWeight: 700,
              lineHeight: 1.1,
              marginTop: 6,
            }}
          >
            {days ?? "—"}
          </div>
          <div style={{ fontSize: 13, opacity: 0.85 }}>days to go</div>
        </div>

        {/* Date & time */}
        <div className="dl-card" style={{ padding: 20 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ink-mute)", letterSpacing: ".04em" }}>
            Date &amp; time
          </div>
          <div
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 20,
              fontWeight: 600,
              color: "var(--ink)",
              marginTop: 8,
            }}
          >
            {c.hearingDate}
          </div>
          <div style={{ fontFamily: "var(--font-serif)", fontSize: 17, color: "var(--ink-soft)" }}>
            {c.hearingTime}
          </div>
        </div>

        {/* Location */}
        <div className="dl-card" style={{ padding: 20 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ink-mute)", letterSpacing: ".04em" }}>
            Location
          </div>
          <div
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 20,
              fontWeight: 600,
              color: "var(--ink)",
              marginTop: 8,
            }}
          >
            {c.room}
          </div>
          <div style={{ fontFamily: "var(--font-serif)", fontSize: 17, color: "var(--ink-soft)" }}>
            {c.tribunal}
          </div>
        </div>

        {/* Claim amount */}
        <div className="dl-card" style={{ padding: 20 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ink-mute)", letterSpacing: ".04em" }}>
            Claim amount
          </div>
          <div
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 24,
              fontWeight: 700,
              color: "var(--green)",
              marginTop: 8,
            }}
          >
            {c.amountStr}
          </div>
          <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>Full refund sought</div>
        </div>
      </div>

      {/* Two-column grid */}
      <div className="dl-grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(330px,1fr))" }}>
        {/* LEFT — script card */}
        <div className="dl-card" style={{ overflow: "hidden", padding: 24 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 18,
            }}
          >
            <Icon name="menu_book" size={24} fill color="var(--teal)" />
            <span className="dl-card-title" style={{ flex: 1 }}>
              Your hearing script
            </span>
            {activeCase.scriptReviewed && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: "var(--green-soft)",
                  color: "var(--green)",
                  borderRadius: 30,
                  padding: "5px 12px",
                  fontWeight: 700,
                  fontSize: 12.5,
                }}
              >
                <Icon name="task_alt" size={16} fill color="var(--green)" />
                Reviewed
              </span>
            )}
          </div>

          {sections.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
              {sections.map((sec) => (
                <div key={sec.id}>
                  <div>{tagChip(sec.tag)}</div>
                  {sec.lines.map((line, i) => (
                    <p
                      key={i}
                      style={{
                        fontFamily: "var(--font-serif)",
                        fontSize: 18,
                        lineHeight: 1.6,
                        color: "var(--ink)",
                        margin: "0 0 8px",
                      }}
                    >
                      {line}
                    </p>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                textAlign: "center",
                padding: "30px 16px",
                color: "var(--ink-soft)",
              }}
            >
              <Icon name="auto_awesome" size={36} color="var(--teal)" />
              <div style={{ fontSize: 15, marginTop: 12, marginBottom: 4, color: "var(--ink)", fontWeight: 600 }}>
                No script yet
              </div>
              <div style={{ fontSize: 13.5 }}>
                Generate a script from your included evidence to get started.
              </div>
            </div>
          )}

          {/* Primary action(s) */}
          <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 10 }}>
            {sections.length === 0 ? (
              <button
                className="dl-btn dl-btn-primary"
                onClick={generateScript}
                disabled={loading}
                style={{ width: "100%" }}
              >
                {loading ? <span className="dl-spin" /> : <Icon name="auto_awesome" size={20} fill />}
                Generate my script
              </button>
            ) : !activeCase.scriptReviewed ? (
              <button
                className="dl-btn dl-btn-primary"
                onClick={() => {
                  updateActive((cd) => ({ ...cd, scriptReviewed: true }));
                  showToast("Script marked as reviewed", "menu_book");
                }}
                style={{ width: "100%" }}
              >
                <Icon name="task_alt" size={20} fill />
                Mark script as reviewed
              </button>
            ) : (
              <button
                className="dl-btn"
                onClick={generateScript}
                disabled={loading}
                style={{ width: "100%" }}
              >
                {loading ? <span className="dl-spin" /> : <Icon name="auto_awesome" size={20} />}
                Regenerate script
              </button>
            )}
          </div>
        </div>

        {/* RIGHT — checklist + tip */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Checklist */}
          <div className="dl-card" style={{ padding: 24 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 14,
              }}
            >
              <span className="dl-card-title">Hearing-day checklist</span>
              <span style={{ fontWeight: 800, color: "var(--green)", fontSize: 14 }}>{pct}%</span>
            </div>

            <div className="dl-track" style={{ marginBottom: 16 }}>
              <span style={{ width: `${pct}%` }} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {checklist.map((ck) => (
                <button
                  key={ck.id}
                  onClick={() =>
                    updateActive((cd) => ({
                      ...cd,
                      checklist: cd.checklist.map((x) =>
                        x.id === ck.id ? { ...x, done: !x.done } : x,
                      ),
                    }))
                  }
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    textAlign: "left",
                    padding: "12px 14px",
                    borderRadius: 12,
                    background: ck.done ? "var(--green-soft)" : "var(--surface-2)",
                    border: "1px solid var(--line)",
                    cursor: "pointer",
                    font: "inherit",
                  }}
                >
                  <Icon
                    name={ck.done ? "check_circle" : "radio_button_unchecked"}
                    size={22}
                    fill={ck.done}
                    color={ck.done ? "var(--green)" : "var(--ink-mute)"}
                  />
                  <span
                    style={{
                      fontSize: 14,
                      color: "var(--ink)",
                      textDecoration: ck.done ? "line-through" : "none",
                      opacity: ck.done ? 0.65 : 1,
                    }}
                  >
                    {ck.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Tip callout */}
          <div
            className="dl-card"
            style={{
              padding: 20,
              background: "var(--teal-soft)",
              border: "1px solid var(--teal)",
              display: "flex",
              gap: 14,
              alignItems: "flex-start",
            }}
          >
            <Icon name="lightbulb" size={24} fill color="var(--teal-strong)" />
            <div>
              <div style={{ fontWeight: 700, color: "var(--teal-strong)", fontSize: 14, marginBottom: 4 }}>
                Tip from D&apos;Law
              </div>
              <div style={{ fontSize: 14, color: "var(--ink)", lineHeight: 1.5 }}>
                Speak slowly and stick to dates. The tribunal values a clear chronology over emotion.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
