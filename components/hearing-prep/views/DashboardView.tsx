"use client";

// Dashboard view: the workspace home. A readiness hero (live score donut +
// breakdown), feature cards summarising evidence / facts / timeline / script,
// and an interactive hearing-day checklist. All data comes from the workspace
// store; every card navigates via the UI context.

import { useWorkspace } from "@/lib/store/WorkspaceProvider";
import { useUI, Icon } from "@/components/hearing-prep/ui";
import { readiness, deriveTimeline, deriveFactGroups } from "@/lib/store/store";

export function DashboardView() {
  const { activeCase, updateActive } = useWorkspace();
  const { setView } = useUI();

  const c = activeCase.meta;
  const r = readiness(activeCase);
  const score = r.score;

  const days = c.hearingISO
    ? Math.max(0, Math.ceil((new Date(c.hearingISO).getTime() - Date.now()) / 86400000))
    : null;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const firstName = (activeCase.meta.claimant || "there").trim().split(/\s+/)[0] || "there";

  const timeline = activeCase.timeline.length
    ? activeCase.timeline
    : deriveTimeline(activeCase.evidence);

  const facts = activeCase.factGroups.length
    ? activeCase.factGroups
    : deriveFactGroups(activeCase.evidence);
  const factCount = facts.reduce((n, g) => n + g.items.length, 0);

  const breakdown = [
    { label: "Evidence collected", pct: r.evidence },
    { label: "Checklist done", pct: r.checklist },
    { label: "Q&A rehearsed", pct: r.qa },
    { label: "Script reviewed", pct: r.script },
  ];

  const dash = 2 * Math.PI * 52;
  const offset = dash * (1 - score / 100);

  const checklist = activeCase.checklist;
  const doneCount = checklist.filter((x) => x.done).length;
  const totalCount = checklist.length;
  const checkPct = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;

  const evMore = Math.max(0, activeCase.evidence.length - 4);
  const scriptPreview =
    activeCase.scriptSections[0]?.lines[0] ??
    "Good morning, Your Honour. My name is the claimant in this matter.";
  const firstQa = activeCase.qa[0];

  const tealGrad = "linear-gradient(135deg, var(--teal), var(--teal-strong))";
  const navyGrad = "linear-gradient(135deg, var(--navy), var(--navy-2))";

  const badgeStyle = (grad: string) =>
    ({
      width: 52,
      height: 52,
      borderRadius: 15,
      background: grad,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    }) as const;

  const cardLink = (label: string) =>
    (
      <div
        style={{
          marginTop: 16,
          color: "var(--teal)",
          fontWeight: 700,
          fontSize: 13.5,
        }}
      >
        {label}
      </div>
    );

  return (
    <div className="dl-view">
      {/* 1 · Header row */}
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
          <div className="dl-eyebrow" style={{ color: "var(--teal)", fontSize: 13, fontWeight: 700 }}>
            {greeting}, {firstName}
          </div>
          <h1 className="dl-h1">Let&apos;s get you ready for the hearing</h1>
          <p className="dl-sub">
            {c.caseNo} · {c.title}
          </p>
        </div>
        <button
          className="dl-btn dl-btn-primary"
          onClick={() => setView("qa")}
          style={{ height: 48 }}
        >
          <Icon name="bolt" size={20} fill />
          Start practice
        </button>
      </div>

      {/* 2 · Readiness hero */}
      <div
        className="dl-card"
        style={{ padding: "clamp(20px,2.6vw,30px)", borderRadius: 24, marginBottom: 18 }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))",
            gap: 18,
          }}
        >
          {/* Left: hearing meta */}
          <div>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 9,
                background: "var(--amber-soft)",
                color: "var(--amber)",
                borderRadius: 30,
                padding: "7px 14px",
                fontWeight: 700,
                fontSize: 13.5,
              }}
            >
              <Icon name="event" size={18} fill color="var(--amber)" />
              {days !== null ? `Hearing in ${days} days` : "Hearing date to be set"}
            </span>

            <div
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: "clamp(22px,3vw,29px)",
                fontWeight: 600,
                color: "var(--ink)",
                marginTop: 16,
              }}
            >
              {c.hearingDate} · {c.hearingTime}
            </div>
            <div style={{ fontSize: 14.5, color: "var(--ink-soft)", marginTop: 4 }}>
              {c.room} · {c.tribunal}
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 18 }}>
              <button className="dl-btn" onClick={() => setView("hearings")}>
                <Icon name="menu_book" size={20} />
                Review script
              </button>
              <button className="dl-btn" onClick={() => setView("hearings")}>
                <Icon name="checklist" size={20} />
                Checklist
              </button>
            </div>
          </div>

          {/* Right: donut + breakdown */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "clamp(16px,2vw,30px)",
              flexWrap: "wrap",
            }}
          >
            <div style={{ position: "relative", width: 172, height: 172, flexShrink: 0 }}>
              <svg
                width={172}
                height={172}
                viewBox="0 0 120 120"
                style={{ transform: "rotate(-90deg)" }}
              >
                <defs>
                  <linearGradient id="dlring" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#13a594" />
                    <stop offset="100%" stopColor="#37d6c0" />
                  </linearGradient>
                </defs>
                <circle cx={60} cy={60} r={52} fill="none" stroke="var(--surface-3)" strokeWidth={13} />
                <circle
                  cx={60}
                  cy={60}
                  r={52}
                  fill="none"
                  stroke="url(#dlring)"
                  strokeWidth={13}
                  strokeLinecap="round"
                  strokeDasharray={dash}
                  strokeDashoffset={offset}
                  style={{ transition: "stroke-dashoffset 1.1s" }}
                />
              </svg>
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: 44,
                    fontWeight: 700,
                    color: "var(--ink)",
                    lineHeight: 1,
                  }}
                >
                  {score}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: ".08em",
                    color: "var(--ink-mute)",
                    marginTop: 4,
                  }}
                >
                  Ready
                </span>
              </div>
            </div>

            <div style={{ flex: 1, minWidth: 160, display: "flex", flexDirection: "column", gap: 12 }}>
              {breakdown.map((b) => (
                <div key={b.label}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 12.5,
                      color: "var(--ink-soft)",
                      marginBottom: 5,
                    }}
                  >
                    <span>{b.label}</span>
                    <span>{b.pct}%</span>
                  </div>
                  <div className="dl-track">
                    <span style={{ width: `${b.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3 · Feature cards */}
      <div
        className="dl-grid"
        style={{
          gridTemplateColumns: "repeat(auto-fit,minmax(330px,1fr))",
          marginBottom: 18,
        }}
      >
        {/* Uploaded Evidence */}
        <div className="dl-card dl-lift" style={{ padding: 24, cursor: "pointer" }} onClick={() => setView("evidence")}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={badgeStyle(tealGrad)}>
              <Icon name="cloud_upload" size={26} fill color="#fff" />
            </div>
            <div>
              <div className="dl-card-title">Uploaded Evidence</div>
              <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>
                {activeCase.evidence.length} files ready
              </div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(72px,1fr))",
              gap: 8,
              marginTop: 16,
            }}
          >
            {activeCase.evidence.slice(0, 4).map((e) => (
              <div
                key={e.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                  background: "var(--surface-2)",
                  borderRadius: 14,
                  padding: "13px 8px",
                  textAlign: "center",
                  minWidth: 0,
                }}
              >
                <Icon name={e.icon} size={25} color={e.color} />
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--ink)",
                    maxWidth: "100%",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {e.short}
                </span>
                <span style={{ fontSize: 10, color: "var(--ink-mute)" }}>{e.meta}</span>
              </div>
            ))}
            {evMore > 0 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 14,
                  padding: "13px 8px",
                  border: "1.5px dashed var(--teal)",
                  color: "var(--teal)",
                  fontWeight: 700,
                  fontSize: 12.5,
                }}
              >
                +{evMore} more
              </div>
            )}
          </div>

          {cardLink("View all evidence →")}
        </div>

        {/* Summary & Key Facts */}
        <div className="dl-card dl-lift" style={{ padding: 24, cursor: "pointer" }} onClick={() => setView("export")}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={badgeStyle(navyGrad)}>
              <Icon name="description" size={26} fill color="#fff" />
            </div>
            <div>
              <div className="dl-card-title">Summary &amp; Key Facts</div>
              <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>
                AI extracted {factCount} key facts
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 16 }}>
            {facts.slice(0, 5).map((g) => (
              <div key={g.label} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <Icon name="check_circle" size={20} fill color="var(--green)" />
                <span style={{ fontSize: 14, color: "var(--ink)" }}>{g.label}</span>
              </div>
            ))}
          </div>

          {cardLink("View summary →")}
        </div>

        {/* Timeline */}
        <div className="dl-card dl-lift" style={{ padding: 24, cursor: "pointer" }} onClick={() => setView("timeline")}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={badgeStyle(tealGrad)}>
              <Icon name="calendar_month" size={26} fill color="#fff" />
            </div>
            <div>
              <div className="dl-card-title">Timeline</div>
              <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>Events arranged by date</div>
            </div>
          </div>

          {timeline.length === 0 ? (
            <div style={{ marginTop: 16, fontSize: 13.5, color: "var(--ink-mute)" }}>
              No dated events yet — upload evidence
            </div>
          ) : (
            <div style={{ marginTop: 16 }}>
              {timeline.slice(0, 5).map((t, i, arr) => (
                <div key={t.id} style={{ display: "flex", gap: 12 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <span
                      style={{
                        width: 11,
                        height: 11,
                        borderRadius: "50%",
                        background: t.dot,
                        marginTop: 4,
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        width: 2,
                        flex: 1,
                        background: "var(--line-strong)",
                        margin: "3px 0",
                        opacity: i === arr.length - 1 ? 0 : 1,
                      }}
                    />
                  </div>
                  <div style={{ flex: 1, paddingBottom: 12, minWidth: 0 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                      <span style={{ fontSize: 12, color: "var(--ink-mute)" }}>{t.date}</span>
                      {t.amount && (
                        <span style={{ marginLeft: "auto", fontWeight: 800, color: "var(--green)", fontSize: 13 }}>
                          {t.amount}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{t.title}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {cardLink("View full timeline →")}
        </div>

        {/* Hearing Script & Q&A */}
        <div className="dl-card dl-lift" style={{ padding: 24, cursor: "pointer" }} onClick={() => setView("hearings")}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={badgeStyle(navyGrad)}>
              <Icon name="mic" size={26} fill color="#fff" />
            </div>
            <div>
              <div className="dl-card-title">Hearing Script &amp; Q&amp;A</div>
              <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>Rehearse what you&apos;ll say</div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))",
              gap: 12,
              marginTop: 16,
            }}
          >
            <div style={{ background: "var(--surface-2)", borderRadius: 14, padding: 13 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: ".06em",
                  color: "var(--ink-mute)",
                  marginBottom: 6,
                }}
              >
                Script preview
              </div>
              <div
                style={{
                  fontFamily: "var(--font-serif)",
                  fontStyle: "italic",
                  fontSize: 13.5,
                  color: "var(--ink)",
                  lineHeight: 1.5,
                }}
              >
                {scriptPreview}
              </div>
            </div>

            <div style={{ background: "var(--surface-2)", borderRadius: 14, padding: 13 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: ".06em",
                  color: "var(--ink-mute)",
                  marginBottom: 6,
                }}
              >
                Likely Q&amp;A
              </div>
              <div style={{ fontSize: 13, color: "var(--ink)", lineHeight: 1.5 }}>
                <div style={{ fontWeight: 700 }}>
                  Q: {firstQa?.q ?? "What remedy are you seeking?"}
                </div>
                <div style={{ color: "var(--ink-soft)", marginTop: 2 }}>
                  A: {firstQa?.a ?? "A full refund of the amount claimed."}
                </div>
              </div>
            </div>
          </div>

          {cardLink("Open script & Q&A →")}
        </div>
      </div>

      {/* 4 · Checklist preview */}
      <div className="dl-card" style={{ padding: 24 }}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 14,
            marginBottom: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 13,
                background: "var(--teal-soft)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Icon name="checklist" size={24} fill color="var(--teal)" />
            </div>
            <div>
              <div className="dl-card-title">Hearing-day checklist</div>
              <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>
                {doneCount} of {totalCount} done · tap to tick off
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="dl-track" style={{ width: 110 }}>
              <span style={{ width: `${checkPct}%` }} />
            </div>
            <span style={{ fontWeight: 800, color: "var(--green)", fontSize: 13.5 }}>{checkPct}%</span>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
            gap: 10,
          }}
        >
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
    </div>
  );
}
