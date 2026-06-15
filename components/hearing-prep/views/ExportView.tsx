"use client";

// Export view: pick which sections go into the hearing bundle, preview a cover
// sheet, then generate a real print-to-PDF document using the .dl-print-root
// infrastructure already in globals.css. No new dependencies — we render the
// printable bundle (hidden) and drive window.print() on demand.

import { useWorkspace } from "@/lib/store/WorkspaceProvider";
import { useUI, Icon } from "@/components/hearing-prep/ui";
import { deriveTimeline, deriveFactGroups } from "@/lib/store/store";

export function ExportView() {
  const { activeCase, updateActive } = useWorkspace();
  const { showToast } = useUI();

  const c = activeCase.meta;
  const opts = activeCase.exportOpts;
  const selCount = opts.filter((o) => o.sel).length;

  const isSel = (id: string) => opts.some((o) => o.id === id && o.sel);

  const evidence = activeCase.evidence.filter((e) => e.included);
  const timeline = activeCase.timeline.length
    ? activeCase.timeline
    : deriveTimeline(activeCase.evidence);
  const facts = activeCase.factGroups.length
    ? activeCase.factGroups
    : deriveFactGroups(activeCase.evidence);

  const generate = () => {
    if (typeof window === "undefined") return;
    const cleanup = () => {
      document.body.classList.remove("dl-printing");
      window.onafterprint = null;
    };
    window.onafterprint = cleanup;
    document.body.classList.add("dl-printing");
    window.print();
    showToast(`Hearing bundle generated (${selCount} sections)`, "task_alt");
  };

  // ── Printable document styles (plain, black-on-white, court-ready) ──
  const pHead = {
    fontFamily: "var(--font-serif)",
    fontSize: 17,
    fontWeight: 700,
    margin: "26px 0 10px",
    borderBottom: "1px solid #ccc",
    paddingBottom: 5,
    pageBreakAfter: "avoid" as const,
  };
  const pRow = { margin: "3px 0", fontSize: 13, lineHeight: 1.5 };
  const pItem = { margin: "8px 0", fontSize: 13, lineHeight: 1.5, pageBreakInside: "avoid" as const };

  return (
    <div className="dl-view">
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div className="dl-eyebrow" style={{ color: "var(--teal)", fontSize: 13, fontWeight: 700 }}>
          Take it with you
        </div>
        <h1 className="dl-h1">Build your hearing bundle</h1>
        <p className="dl-sub">
          Choose what to include, then generate a print-ready PDF to bring to court.
        </p>
      </div>

      <div className="dl-grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))" }}>
        {/* LEFT — sections to include */}
        <div className="dl-card" style={{ padding: 24 }}>
          <div className="dl-card-title">Sections to include</div>
          <div className="dl-sub" style={{ marginBottom: 16 }}>
            {selCount} of {opts.length} selected
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {opts.map((x) => (
              <button
                key={x.id}
                onClick={() =>
                  updateActive((cd) => ({
                    ...cd,
                    exportOpts: cd.exportOpts.map((o) =>
                      o.id === x.id ? { ...o, sel: !o.sel } : o,
                    ),
                  }))
                }
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  width: "100%",
                  textAlign: "left",
                  padding: "15px 16px",
                  borderRadius: 14,
                  cursor: "pointer",
                  font: "inherit",
                  background: x.sel ? "var(--teal-soft)" : "var(--surface-2)",
                  border: x.sel ? "1.5px solid var(--teal)" : "1.5px solid var(--line)",
                }}
              >
                <Icon
                  name={x.sel ? "check_box" : "check_box_outline_blank"}
                  size={22}
                  fill={x.sel}
                  color={x.sel ? "var(--teal)" : "var(--ink-mute)"}
                />
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 14.5, fontWeight: 700, color: "var(--ink)" }}>
                    {x.label}
                  </span>
                  <span style={{ display: "block", fontSize: 12.5, color: "var(--ink-mute)", marginTop: 2 }}>
                    {x.desc}
                  </span>
                </span>
              </button>
            ))}
          </div>

          <button
            className="dl-btn dl-btn-primary"
            onClick={generate}
            disabled={selCount === 0}
            style={{ width: "100%", marginTop: 18, justifyContent: "center", opacity: selCount === 0 ? 0.55 : 1 }}
          >
            <Icon name="picture_as_pdf" size={21} fill />
            Generate bundle PDF
          </button>
        </div>

        {/* RIGHT — cover sheet preview */}
        <div>
          <div
            className="dl-eyebrow"
            style={{ color: "var(--ink-mute)", fontSize: 12, fontWeight: 700, marginBottom: 10 }}
          >
            Cover sheet preview
          </div>

          <div
            className="dl-card"
            style={{
              aspectRatio: "1 / 1.2",
              padding: 30,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* D'Law mark */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 9,
                  background: "linear-gradient(135deg, var(--teal), var(--teal-strong))",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  fontSize: 16,
                  fontFamily: "var(--font-serif)",
                }}
              >
                D
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-soft)" }}>
                D&apos;Law · Hearing Bundle
              </span>
            </div>

            {/* Middle */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: ".1em",
                  color: "var(--ink-mute)",
                  marginBottom: 8,
                }}
              >
                Case
              </div>
              <div
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: "clamp(20px,2.6vw,27px)",
                  fontWeight: 600,
                  color: "var(--ink)",
                  lineHeight: 1.25,
                  marginBottom: 20,
                }}
              >
                {c.title}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                {[
                  ["Case no.", c.caseNo],
                  ["Claimant", c.claimant],
                  ["Respondent", c.respondent],
                  ["Hearing", `${c.hearingDate} · ${c.hearingTime}`],
                ].map(([k, v]) => (
                  <div
                    key={k}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 14,
                      fontSize: 13,
                      borderBottom: "1px solid var(--line)",
                      paddingBottom: 8,
                    }}
                  >
                    <span style={{ color: "var(--ink-mute)", flexShrink: 0 }}>{k}</span>
                    <span style={{ color: "var(--ink)", fontWeight: 600, textAlign: "right" }}>{v}</span>
                  </div>
                ))}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 14,
                    fontSize: 13,
                    paddingBottom: 2,
                  }}
                >
                  <span style={{ color: "var(--ink-mute)", flexShrink: 0 }}>Amount claimed</span>
                  <span style={{ color: "var(--green)", fontWeight: 800, textAlign: "right" }}>
                    {c.amountStr}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                fontSize: 11,
                color: "var(--ink-mute)",
                borderTop: "1px solid var(--line)",
                paddingTop: 12,
              }}
            >
              {selCount} sections · generated by D&apos;Law
            </div>
          </div>
        </div>
      </div>

      {/* ── PRINTABLE DOCUMENT (hidden until printing) ── */}
      <div
        className="dl-print-root"
        style={{
          color: "#111",
          background: "#fff",
          fontFamily: "var(--font-serif), Georgia, serif",
          padding: 40,
          maxWidth: 720,
          margin: "0 auto",
        }}
      >
        {/* Bundle title */}
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <div style={{ fontSize: 12, letterSpacing: ".18em", textTransform: "uppercase" }}>
            D&apos;Law · Hearing Bundle
          </div>
          <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 24, margin: "8px 0 2px" }}>
            {c.title}
          </h1>
          <div style={{ fontSize: 13 }}>
            {c.caseNo} · {c.tribunal}
          </div>
        </div>

        {/* x1 — Cover sheet & case summary */}
        {isSel("x1") && (
          <section>
            <h2 style={pHead}>Cover sheet &amp; case summary</h2>
            <div style={pRow}>
              <strong>Case:</strong> {c.title}
            </div>
            <div style={pRow}>
              <strong>Case no.:</strong> {c.caseNo}
            </div>
            <div style={pRow}>
              <strong>Tribunal:</strong> {c.tribunal}
            </div>
            <div style={pRow}>
              <strong>Claimant:</strong> {c.claimant}
            </div>
            <div style={pRow}>
              <strong>Respondent:</strong> {c.respondent}
            </div>
            <div style={pRow}>
              <strong>Hearing:</strong> {c.hearingDate} · {c.hearingTime} · {c.room}
            </div>
            <div style={pRow}>
              <strong>Amount claimed:</strong> {c.amountStr}
            </div>
          </section>
        )}

        {/* x2 — Evidence index & list */}
        {isSel("x2") && (
          <section>
            <h2 style={pHead}>Evidence index &amp; list</h2>
            {evidence.length === 0 ? (
              <div style={pRow}>No evidence included.</div>
            ) : (
              <ol style={{ paddingLeft: 22, margin: 0 }}>
                {evidence.map((e) => (
                  <li key={e.id} style={pItem}>
                    <strong>{e.name}</strong> — {e.type} · {e.date} · {e.tag}
                  </li>
                ))}
              </ol>
            )}
          </section>
        )}

        {/* x3 — Annotated timeline */}
        {isSel("x3") && (
          <section>
            <h2 style={pHead}>Annotated timeline</h2>
            {timeline.length === 0 ? (
              <div style={pRow}>No dated events.</div>
            ) : (
              timeline.map((t) => (
                <div key={t.id} style={pItem}>
                  <strong>{t.date}</strong> — {t.title} — {t.desc}
                  {t.amount ? ` (${t.amount})` : ""}
                </div>
              ))
            )}
          </section>
        )}

        {/* x4 — Hearing script */}
        {isSel("x4") && (
          <section>
            <h2 style={pHead}>Hearing script</h2>
            {activeCase.scriptSections.length === 0 ? (
              <div style={pRow}>No script prepared.</div>
            ) : (
              activeCase.scriptSections.map((s) => (
                <div key={s.id} style={{ marginBottom: 14, pageBreakInside: "avoid" }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5, margin: "6px 0 4px" }}>{s.tag}</div>
                  {s.lines.map((line, i) => (
                    <p key={i} style={{ ...pRow, margin: "3px 0" }}>
                      {line}
                    </p>
                  ))}
                </div>
              ))
            )}
          </section>
        )}

        {/* x5 — Q&A preparation sheet */}
        {isSel("x5") && (
          <section>
            <h2 style={pHead}>Q&amp;A preparation sheet</h2>
            {activeCase.qa.length === 0 ? (
              <div style={pRow}>No questions prepared.</div>
            ) : (
              activeCase.qa.map((qa) => (
                <div key={qa.id} style={pItem}>
                  <div style={{ fontWeight: 700 }}>Q: {qa.q}</div>
                  <div>A: {qa.a}</div>
                  {qa.tip && <div style={{ fontStyle: "italic", color: "#555" }}>Tip: {qa.tip}</div>}
                </div>
              ))
            )}
          </section>
        )}

        {/* x6 — Key facts summary */}
        {isSel("x6") && (
          <section>
            <h2 style={pHead}>Key facts summary</h2>
            {facts.length === 0 ? (
              <div style={pRow}>No key facts extracted.</div>
            ) : (
              facts.map((g) => (
                <div key={g.label} style={{ marginBottom: 12, pageBreakInside: "avoid" }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5, margin: "6px 0 4px" }}>{g.label}</div>
                  <ul style={{ paddingLeft: 22, margin: 0 }}>
                    {g.items.map((it, i) => (
                      <li key={i} style={pRow}>
                        {it}
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </section>
        )}

        {/* x7 — Confidence checklist */}
        {isSel("x7") && (
          <section>
            <h2 style={pHead}>Confidence checklist</h2>
            {activeCase.checklist.map((ck) => (
              <div key={ck.id} style={pRow}>
                {ck.done ? "✓" : "▢"} {ck.label}
              </div>
            ))}
          </section>
        )}

        {/* Disclaimer — always */}
        <p
          style={{
            marginTop: 34,
            paddingTop: 14,
            borderTop: "1px solid #ccc",
            fontSize: 11.5,
            fontStyle: "italic",
            color: "#555",
          }}
        >
          This bundle organises your own facts. It is information, not legal advice; the Tribunal is
          the authority.
        </p>
      </div>
    </div>
  );
}
