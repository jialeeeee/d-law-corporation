"use client";

// Settings view: account profile, appearance (dark mode), and functional
// preferences (hearing reminders, language, data & privacy). All preference
// state lives in the workspace store via useWorkspace(); toggles and the
// language select write straight back through setPref / toggleDark.

import { useWorkspace } from "@/lib/store/WorkspaceProvider";
import { useUI, Icon } from "@/components/hearing-prep/ui";

const LANGUAGES = ["English", "中文", "Bahasa Melayu", "Tamil"];

export function SettingsView() {
  const { prefs, setPref, toggleDark, resetAll } = useWorkspace();
  const { showToast } = useUI();

  // ── Reusable toggle switch (52x30 track, knob slides 22px when on) ──
  const Switch = ({ on }: { on: boolean }) => (
    <span
      aria-hidden
      style={{
        width: 52,
        height: 30,
        borderRadius: 30,
        background: on ? "var(--teal)" : "var(--surface-3)",
        border: "1px solid var(--line-strong)",
        flexShrink: 0,
        display: "inline-block",
        position: "relative",
        transition: "background .18s",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 3,
          left: 3,
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: "#fff",
          boxShadow: "0 1px 3px rgba(0,0,0,.25)",
          transform: on ? "translateX(22px)" : "translateX(0)",
          transition: "transform .18s",
        }}
      />
    </span>
  );

  const tile = {
    width: 42,
    height: 42,
    borderRadius: 12,
    background: "var(--surface-2)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  } as const;

  const rowBase = {
    display: "flex",
    alignItems: "center",
    gap: 14,
    padding: "16px 0",
  } as const;

  return (
    <div className="dl-view" style={{ maxWidth: 760 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div className="dl-eyebrow" style={{ color: "var(--teal)", fontSize: 13, fontWeight: 700 }}>
          Preferences
        </div>
        <h1 className="dl-h1">Settings</h1>
      </div>

      {/* Profile card */}
      <div className="dl-card" style={{ padding: "8px 24px", marginBottom: 18 }}>
        <div style={rowBase}>
          <span
            style={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              background: "linear-gradient(135deg, var(--navy), var(--navy-2))",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: 18,
              fontFamily: "var(--font-serif)",
              flexShrink: 0,
            }}
          >
            YA
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)" }}>Your account</div>
            <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>Self-represented</div>
          </div>
          <button
            className="dl-btn"
            onClick={() => showToast("Profile editing coming soon", "person")}
          >
            <Icon name="edit" size={18} />
            Edit
          </button>
        </div>
      </div>

      {/* Dark mode card */}
      <div className="dl-card" style={{ padding: "8px 24px", marginBottom: 18 }}>
        <button
          onClick={toggleDark}
          style={{ ...rowBase, width: "100%", cursor: "pointer", background: "none", border: "none", font: "inherit" }}
        >
          <span style={tile}>
            <Icon name={prefs.dark ? "dark_mode" : "light_mode"} size={22} color="var(--ink-soft)" />
          </span>
          <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>Dark mode</div>
            <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>
              Easier on the eyes in low light.
            </div>
          </div>
          <Switch on={prefs.dark} />
        </button>
      </div>

      {/* Preferences card */}
      <div className="dl-card" style={{ padding: "8px 24px" }}>
        {/* Hearing reminders */}
        <button
          onClick={() => {
            const next = !prefs.reminders;
            setPref({ reminders: next });
            showToast(next ? "Hearing reminders on" : "Hearing reminders off", "notifications");
          }}
          style={{
            ...rowBase,
            width: "100%",
            cursor: "pointer",
            background: "none",
            border: "none",
            borderBottom: "1px solid var(--line)",
            font: "inherit",
          }}
        >
          <span style={tile}>
            <Icon name="notifications" size={22} color="var(--ink-soft)" />
          </span>
          <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>Hearing reminders</div>
            <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>
              Get nudges as your hearing date approaches.
            </div>
          </div>
          <Switch on={prefs.reminders} />
        </button>

        {/* Language */}
        <div style={{ ...rowBase, borderBottom: "1px solid var(--line)" }}>
          <span style={tile}>
            <Icon name="translate" size={22} color="var(--ink-soft)" />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>Language</div>
            <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>
              Display language for the workspace.
            </div>
          </div>
          <select
            value={prefs.language}
            onChange={(e) => {
              setPref({ language: e.target.value });
              showToast(`Language set to ${e.target.value}`, "translate");
            }}
            className="dl-btn"
            style={{ cursor: "pointer", paddingRight: 12 }}
          >
            {LANGUAGES.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>

        {/* Data & privacy */}
        <div style={{ ...rowBase, alignItems: "flex-start" }}>
          <span style={tile}>
            <Icon name="shield_lock" size={22} color="var(--ink-soft)" />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>Data &amp; privacy</div>
            <div style={{ fontSize: 13, color: "var(--ink-soft)", marginBottom: 12 }}>
              Your cases are stored privately in this browser.
            </div>
            <button
              className="dl-btn"
              onClick={() => {
                if (
                  window.confirm(
                    "Clear all local data? This permanently removes every case and resets the app.",
                  )
                ) {
                  resetAll();
                  showToast("All local data cleared", "delete");
                }
              }}
              style={{ color: "var(--rose)", borderColor: "var(--rose)" }}
            >
              <Icon name="delete" size={18} color="var(--rose)" />
              Clear all local data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
