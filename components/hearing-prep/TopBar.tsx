"use client";

import { useState } from "react";
import { useWorkspace } from "@/lib/store/WorkspaceProvider";
import { readiness } from "@/lib/store/store";
import { signOut } from "@/app/(auth)/actions";
import { Icon, useUI } from "./ui";

export interface AppUser {
  name?: string;
  email?: string;
}

function initials(user?: AppUser): string {
  const src = user?.name || user?.email || "You";
  const parts = src.replace(/@.*/, "").split(/[ ._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "U";
}

const dotForStatus = (status: string): string =>
  status === "Active prep"
    ? "var(--green)"
    : status === "Draft"
      ? "var(--ink-mute)"
      : "var(--amber)";

export function TopBar({
  user,
  mobile,
  onToggleDrawer,
}: {
  user?: AppUser;
  mobile: boolean;
  onToggleDrawer: () => void;
}) {
  const { cases, activeCase, setActiveCase, createCase, prefs, toggleDark } =
    useWorkspace();
  const { showToast, setView } = useUI();
  const [caseMenu, setCaseMenu] = useState(false);

  const onNewCase = () => {
    const title = window.prompt("Name your new case", "Untitled case");
    if (title === null) return;
    createCase(title);
    setCaseMenu(false);
    setView("dashboard");
    showToast("New case created", "add_circle");
  };

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        height: 66,
        padding: "0 clamp(14px,2.5vw,26px)",
        background: "var(--surface)",
        borderBottom: "1px solid var(--line)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {mobile && (
          <button className="dl-icon-btn" onClick={onToggleDrawer} aria-label="Menu">
            <Icon name="menu" size={23} />
          </button>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 11,
              background: "linear-gradient(145deg,var(--teal),var(--teal-strong))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontFamily: "var(--font-serif)",
              fontWeight: 700,
              fontSize: 23,
              boxShadow: "0 6px 16px rgba(19,165,148,.4)",
            }}
          >
            D
          </div>
          <div style={{ lineHeight: 1.05 }}>
            <div
              style={{
                fontFamily: "var(--font-serif)",
                fontWeight: 700,
                fontSize: 19,
                color: "var(--ink)",
              }}
            >
              D&rsquo;Law
            </div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: ".14em",
                textTransform: "uppercase",
                color: "var(--ink-mute)",
              }}
            >
              Hearing Prep
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
        {/* Case switcher */}
        <div style={{ position: "relative", display: mobile ? "none" : "block" }}>
          <button
            onClick={() => setCaseMenu((v) => !v)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 11,
              height: 46,
              padding: "0 10px 0 14px",
              borderRadius: 13,
              background: "var(--surface-2)",
              border: "1px solid var(--line)",
              cursor: "pointer",
              minWidth: 248,
            }}
          >
            <Icon name="folder_open" size={20} color="var(--teal)" />
            <div style={{ flex: 1, textAlign: "left", lineHeight: 1.18, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13.5,
                  fontWeight: 700,
                  color: "var(--ink)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: 160,
                }}
              >
                {activeCase.meta.title}
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-mute)" }}>
                {activeCase.meta.caseNo}
              </div>
            </div>
            <Icon
              name={caseMenu ? "expand_less" : "expand_more"}
              size={22}
              color="var(--ink-mute)"
            />
          </button>

          {caseMenu && (
            <>
              <div
                onClick={() => setCaseMenu(false)}
                style={{ position: "fixed", inset: 0, zIndex: 58 }}
              />
              <div
                style={{
                  position: "absolute",
                  top: 54,
                  left: 0,
                  zIndex: 59,
                  width: 320,
                  background: "var(--surface)",
                  border: "1px solid var(--line)",
                  borderRadius: 16,
                  boxShadow: "var(--shadow-lg)",
                  padding: 8,
                  animation: "dlPop .22s cubic-bezier(.16,1,.3,1) both",
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: ".08em",
                    textTransform: "uppercase",
                    color: "var(--ink-mute)",
                    padding: "10px 12px 8px",
                  }}
                >
                  Your cases
                </div>
                {cases.map((cc) => {
                  const active = cc.meta.id === activeCase.meta.id;
                  const ready = readiness(cc).score;
                  return (
                    <button
                      key={cc.meta.id}
                      onClick={() => {
                        setActiveCase(cc.meta.id);
                        setCaseMenu(false);
                        setView("dashboard");
                        showToast("Opened " + cc.meta.caseNo, "folder_open");
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        width: "100%",
                        padding: "11px 12px",
                        borderRadius: 12,
                        cursor: "pointer",
                        textAlign: "left",
                        marginBottom: 3,
                        border: active
                          ? "1px solid var(--teal)"
                          : "1px solid transparent",
                        background: active ? "var(--teal-soft)" : "transparent",
                      }}
                    >
                      <span
                        style={{
                          width: 9,
                          height: 9,
                          borderRadius: "50%",
                          background: dotForStatus(cc.meta.status),
                          flex: "0 0 auto",
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 13.5,
                            fontWeight: 700,
                            color: "var(--ink)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {cc.meta.title}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            marginTop: 4,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 11.5,
                              fontWeight: 600,
                              color: "var(--ink-mute)",
                            }}
                          >
                            {cc.meta.caseNo}
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: "var(--ink-soft)",
                            }}
                          >
                            &middot; {cc.meta.status}
                          </span>
                        </div>
                        <div className="dl-track" style={{ height: 5, marginTop: 7 }}>
                          <span style={{ width: `${ready}%` }} />
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: 12.5,
                          fontWeight: 800,
                          color: "var(--teal-strong)",
                          flex: "0 0 auto",
                        }}
                      >
                        {ready}%
                      </span>
                    </button>
                  );
                })}
                <button
                  onClick={onNewCase}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    width: "100%",
                    padding: "13px 12px",
                    marginTop: 5,
                    borderTop: "1px solid var(--line)",
                    borderLeft: "none",
                    borderRight: "none",
                    borderBottom: "none",
                    background: "transparent",
                    cursor: "pointer",
                    color: "var(--teal-strong)",
                    fontFamily: "var(--font-sans)",
                    fontSize: 13.5,
                    fontWeight: 700,
                  }}
                >
                  <Icon name="add_circle" size={21} /> Create a new case
                </button>
              </div>
            </>
          )}
        </div>

        <button
          className="dl-icon-btn"
          onClick={toggleDark}
          title="Toggle theme"
          aria-label="Toggle theme"
        >
          <Icon name={prefs.dark ? "light_mode" : "dark_mode"} />
        </button>

        <button
          className="dl-icon-btn"
          style={{ position: "relative" }}
          onClick={() => showToast("No new notifications", "notifications")}
          aria-label="Notifications"
        >
          <Icon name="notifications" />
          <span
            style={{
              position: "absolute",
              top: 9,
              right: 10,
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "var(--rose)",
              border: "2px solid var(--surface-2)",
            }}
          />
        </button>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "4px 6px 4px 4px",
            borderRadius: 40,
            border: "1px solid var(--line)",
            background: "var(--surface-2)",
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              background: "linear-gradient(140deg,#1f3a6b,#0a1430)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontWeight: 700,
              fontSize: 13.5,
            }}
          >
            {initials(user)}
          </div>
          <div style={{ lineHeight: 1.15, paddingRight: 6, display: mobile ? "none" : "block" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>
              {user?.name || user?.email?.replace(/@.*/, "") || "Your account"}
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-mute)" }}>
              Self-represented
            </div>
          </div>
        </div>

        <form action={signOut} style={{ display: "flex" }}>
          <button
            type="submit"
            className="dl-icon-btn"
            title="Sign out"
            aria-label="Sign out"
          >
            <Icon name="logout" />
          </button>
        </form>
      </div>
    </header>
  );
}
