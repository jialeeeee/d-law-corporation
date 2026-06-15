"use client";

import { useWorkspace } from "@/lib/store/WorkspaceProvider";
import { Icon, useUI } from "./ui";

export function EvidenceSlideOver({
  id,
  onClose,
}: {
  id: string | null;
  onClose: () => void;
}) {
  const { activeCase } = useWorkspace();
  const { setView } = useUI();
  const e = id ? activeCase.evidence.find((x) => x.id === id) : null;
  if (!e) return null;

  const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        padding: "13px 16px",
        background: "var(--surface-2)",
      }}
    >
      <span style={{ fontSize: 13.5, color: "var(--ink-mute)", fontWeight: 600 }}>
        {label}
      </span>
      <span style={{ fontSize: 13.5, color: "var(--ink)", fontWeight: 700 }}>{value}</span>
    </div>
  );

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 70,
          background: "rgba(8,14,30,.5)",
          backdropFilter: "blur(3px)",
          animation: "dlFade .25s ease",
        }}
      />
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          zIndex: 71,
          width: "min(440px,100vw)",
          background: "var(--surface)",
          borderLeft: "1px solid var(--line)",
          boxShadow: "var(--shadow-lg)",
          display: "flex",
          flexDirection: "column",
          animation: "dlPop .3s cubic-bezier(.16,1,.3,1) both",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "20px 22px",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 13, minWidth: 0 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 13,
                background: "var(--surface-2)",
                border: "1px solid var(--line)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: e.color,
                flex: "0 0 auto",
              }}
            >
              <Icon name={e.icon} size={25} fill />
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: "var(--ink)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {e.name}
              </div>
              <div style={{ fontSize: 12.5, color: "var(--ink-mute)", fontWeight: 600 }}>
                {e.type} &middot; {e.meta}
              </div>
            </div>
          </div>
          <button className="dl-icon-btn" style={{ width: 38, height: 38 }} onClick={onClose}>
            <Icon name="close" size={21} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 22 }}>
          <div
            style={{
              height: 160,
              borderRadius: 16,
              border: "1px solid var(--line)",
              backgroundColor: "var(--surface-2)",
              backgroundImage:
                "repeating-linear-gradient(135deg,transparent,transparent 11px,var(--surface-3) 11px,var(--surface-3) 22px)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              marginBottom: 22,
            }}
          >
            <Icon name={e.icon} size={40} color="var(--ink-mute)" fill />
            <span
              style={{
                fontFamily: "ui-monospace,monospace",
                fontSize: 12,
                fontWeight: 600,
                color: "var(--ink-mute)",
                letterSpacing: ".05em",
              }}
            >
              {e.short} &middot; preview
            </span>
          </div>

          <div
            style={{
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: ".06em",
              textTransform: "uppercase",
              color: "var(--ink-mute)",
              marginBottom: 12,
            }}
          >
            Details
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 1,
              borderRadius: 14,
              overflow: "hidden",
              border: "1px solid var(--line)",
              marginBottom: 20,
            }}
          >
            <Row label="Type" value={e.type} />
            <Row label="Size / length" value={e.meta} />
            <Row label="Date" value={e.date} />
            <Row
              label="Category"
              value={
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "var(--teal-strong)",
                    padding: "3px 9px",
                    borderRadius: 7,
                    background: "var(--teal-soft)",
                  }}
                >
                  {e.tag}
                </span>
              }
            />
          </div>

          <div
            style={{
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: ".06em",
              textTransform: "uppercase",
              color: "var(--ink-mute)",
              marginBottom: 10,
            }}
          >
            Why it matters
          </div>
          <div
            style={{
              fontSize: 14.5,
              lineHeight: 1.6,
              color: "var(--ink-soft)",
              fontWeight: 500,
            }}
          >
            {e.note || e.summary || "No summary available for this exhibit."}
          </div>

          {e.extractedText && (
            <>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: ".06em",
                  textTransform: "uppercase",
                  color: "var(--ink-mute)",
                  margin: "20px 0 10px",
                }}
              >
                Extracted text
              </div>
              <pre
                style={{
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  background: "var(--surface-2)",
                  border: "1px solid var(--line)",
                  borderRadius: 12,
                  padding: 14,
                  maxHeight: 240,
                  overflow: "auto",
                  fontSize: 12.5,
                  color: "var(--ink-soft)",
                  margin: 0,
                }}
              >
                {e.extractedText}
              </pre>
            </>
          )}
        </div>

        <div style={{ display: "flex", gap: 10, padding: "18px 22px", borderTop: "1px solid var(--line)" }}>
          <button
            className="dl-btn dl-btn-primary"
            style={{ flex: 1, height: 46 }}
            onClick={() => {
              onClose();
              setView("export");
            }}
          >
            <Icon name="add" size={19} /> Add to bundle
          </button>
          <button className="dl-btn" style={{ height: 46 }} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </>
  );
}
