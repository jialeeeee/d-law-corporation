"use client";

// Timeline view: the case chronology rendered as a vertical, evidence-linked
// timeline. Reads the case timeline (or derives it from evidence) via the
// workspace store; navigation/evidence handoff goes through the UI context.

import { useWorkspace } from "@/lib/store/WorkspaceProvider";
import { useUI, Icon } from "@/components/hearing-prep/ui";
import { deriveTimeline } from "@/lib/store/store";

export function TimelineView() {
  const { activeCase } = useWorkspace();
  const { setView, openEvidence } = useUI();

  const timeline = activeCase.timeline.length
    ? activeCase.timeline
    : deriveTimeline(activeCase.evidence);

  return (
    <div className="dl-view">
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div className="dl-eyebrow" style={{ color: "var(--teal)", fontSize: 13, fontWeight: 700 }}>
          Chronology
        </div>
        <h1 className="dl-h1">What happened, in order</h1>
        {timeline.length > 0 && (
          <p className="dl-sub">
            {timeline.length} events from agreement to filing. Tap an event to view its evidence.
          </p>
        )}
      </div>

      {timeline.length === 0 ? (
        <div
          className="dl-card"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 14,
            padding: "clamp(36px,6vw,72px) 24px",
            textAlign: "center",
            color: "var(--ink-mute)",
          }}
        >
          <Icon name="timeline" size={48} color="var(--ink-mute)" />
          <div style={{ fontFamily: "var(--font-serif)", fontSize: 22, color: "var(--ink)" }}>
            No events yet
          </div>
          <p style={{ fontSize: 14.5, color: "var(--ink-soft)", maxWidth: 360 }}>
            Upload evidence with dated events and they'll appear here in order.
          </p>
          <button
            className="dl-btn"
            onClick={() => setView("evidence")}
            style={{ marginTop: 4 }}
          >
            <Icon name="cloud_upload" size={20} fill />
            Upload evidence
          </button>
        </div>
      ) : (
        <div className="dl-card" style={{ padding: "clamp(18px,2.4vw,30px)", borderRadius: 22 }}>
          {timeline.map((t, i) => {
            const last = i === timeline.length - 1;
            return (
              <div key={t.id} style={{ display: "flex", gap: 18 }}>
                {/* Left rail: node + connector */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: 13,
                      background: "var(--surface-2)",
                      border: "1px solid var(--line)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <span
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: "50%",
                        background: t.dot,
                      }}
                    />
                  </div>
                  <span
                    style={{
                      width: 2.5,
                      flex: 1,
                      background: "var(--line-strong)",
                      margin: "4px 0",
                      opacity: last ? 0 : 1,
                    }}
                  />
                </div>

                {/* Right content */}
                <div style={{ flex: 1, paddingBottom: 26, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: 6,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 800,
                        fontVariantNumeric: "tabular-nums",
                        color: "var(--ink-soft)",
                      }}
                    >
                      {t.date}
                    </span>
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
                      {t.tag}
                    </span>
                    {t.amount && (
                      <span
                        style={{
                          marginLeft: "auto",
                          fontWeight: 800,
                          color: "var(--green)",
                        }}
                      >
                        {t.amount}
                      </span>
                    )}
                  </div>

                  <div
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontSize: 19,
                      fontWeight: 600,
                      color: "var(--ink)",
                    }}
                  >
                    {t.title}
                  </div>

                  <p
                    style={{
                      fontSize: 14,
                      color: "var(--ink-soft)",
                      maxWidth: 620,
                      lineHeight: 1.55,
                      margin: "4px 0 0",
                    }}
                  >
                    {t.desc}
                  </p>

                  {t.ev && (
                    <button
                      className="dl-btn"
                      onClick={() => openEvidence(t.ev as string)}
                      style={{ height: 36, marginTop: 12 }}
                    >
                      <Icon name="attach_file" size={18} />
                      View linked evidence
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
