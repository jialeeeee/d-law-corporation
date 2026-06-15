"use client";

import { useWorkspace } from "@/lib/store/WorkspaceProvider";
import { readiness } from "@/lib/store/store";
import type { ViewKey } from "@/lib/store/types";
import { Icon, useUI } from "./ui";

const NAV: { id: ViewKey; label: string; icon: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: "space_dashboard" },
  { id: "evidence", label: "Evidence", icon: "folder_open" },
  { id: "timeline", label: "Timeline", icon: "timeline" },
  { id: "hearings", label: "Hearings", icon: "gavel" },
  { id: "qa", label: "Q&A", icon: "quiz" },
  { id: "export", label: "Export", icon: "ios_share" },
  { id: "settings", label: "Settings", icon: "settings" },
];

export function Sidebar({
  mobile,
  drawer,
  onNavigate,
}: {
  mobile: boolean;
  drawer: boolean;
  onNavigate: () => void;
}) {
  const { activeCase } = useWorkspace();
  const { view, setView } = useUI();
  const score = readiness(activeCase).score;

  const evCount = activeCase.evidence.length;
  const qaLeft = activeCase.qa.filter((q) => q.status !== "confident").length;

  const pos: React.CSSProperties = mobile
    ? {
        position: "fixed",
        top: 66,
        left: 0,
        bottom: 0,
        width: 266,
        zIndex: 60,
        transform: `translateX(${drawer ? "0" : "-115%"})`,
        transition: "transform .32s cubic-bezier(.4,0,.2,1)",
        boxShadow: drawer ? "var(--shadow-lg)" : "none",
      }
    : { width: 258, flex: "0 0 258px" };

  return (
    <aside
      style={{
        background: "var(--navy)",
        display: "flex",
        flexDirection: "column",
        padding: "20px 16px",
        borderRight: "1px solid var(--navy-line)",
        ...pos,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: ".16em",
          textTransform: "uppercase",
          color: "var(--navy-ink-soft)",
          padding: "4px 12px 12px",
        }}
      >
        Navigate
      </div>
      <nav style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {NAV.map((item) => {
          const active = view === item.id;
          const badge =
            item.id === "evidence" && evCount
              ? String(evCount)
              : item.id === "qa" && qaLeft
                ? String(qaLeft)
                : null;
          return (
            <button
              key={item.id}
              onClick={() => {
                setView(item.id);
                onNavigate();
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 13,
                padding: "11px 14px",
                borderRadius: 13,
                cursor: "pointer",
                fontFamily: "var(--font-sans)",
                fontSize: 14.5,
                fontWeight: 650,
                border: "1px solid transparent",
                transition: "all .18s ease",
                width: "100%",
                textAlign: "left",
                background: active
                  ? "linear-gradient(135deg,var(--teal),var(--teal-strong))"
                  : "transparent",
                color: active ? "#fff" : "var(--navy-ink)",
                boxShadow: active ? "0 10px 22px rgba(19,165,148,.34)" : "none",
              }}
            >
              <Icon name={item.icon} size={22} fill={active} />
              <span style={{ flex: 1 }}>{item.label}</span>
              {badge && (
                <span
                  style={{
                    minWidth: 22,
                    height: 22,
                    padding: "0 7px",
                    borderRadius: 11,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11.5,
                    fontWeight: 800,
                    background: active ? "rgba(255,255,255,.22)" : "var(--navy-2)",
                    color: active ? "#fff" : "var(--navy-ink)",
                  }}
                >
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
        <div
          style={{
            padding: 16,
            borderRadius: 16,
            background:
              "linear-gradient(150deg,rgba(19,165,148,.16),rgba(19,165,148,.04))",
            border: "1px solid rgba(19,165,148,.22)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 10 }}>
            <Icon name="verified_user" size={20} color="var(--teal)" fill />
            <span style={{ fontSize: 13, fontWeight: 700, color: "#eaf1ff" }}>
              Hearing readiness
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 9 }}>
            <span
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 30,
                fontWeight: 700,
                color: "#fff",
                lineHeight: 1,
              }}
            >
              {score}
              <span style={{ fontSize: 16 }}>%</span>
            </span>
          </div>
          <div style={{ height: 8, borderRadius: 6, background: "rgba(255,255,255,.1)", overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                borderRadius: 6,
                background: "linear-gradient(90deg,var(--teal),#3dd9c4)",
                width: `${score}%`,
                transition: "width 1s cubic-bezier(.4,0,.2,1)",
              }}
            />
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 12px",
            color: "var(--navy-ink-soft)",
          }}
        >
          <Icon name="shield_lock" size={19} color="var(--green)" />
          <span style={{ fontSize: 11.5, fontWeight: 600, lineHeight: 1.35 }}>
            Secure &amp; private &middot;
            <br />
            Built for Singapore
          </span>
        </div>
      </div>
    </aside>
  );
}
