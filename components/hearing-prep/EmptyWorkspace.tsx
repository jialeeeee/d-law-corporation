"use client";

// Shown when a signed-in user has no cases yet. A brand-new account starts here
// — there is no auto-created "Untitled case". The user must create their first
// case before the workspace opens.

import { useState } from "react";
import { useWorkspace } from "@/lib/store/WorkspaceProvider";
import { signOut } from "@/app/(auth)/actions";
import { Icon } from "./ui";
import type { AppUser } from "./TopBar";

export function EmptyWorkspace({ user }: { user?: AppUser }) {
  const { createCase, prefs, toggleDark } = useWorkspace();
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  const greeting = user?.name || user?.email?.replace(/@.*/, "") || "there";

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    // createCase appends the new case and makes it active → the provider's
    // cases.length becomes 1 and the full workspace shell mounts automatically.
    createCase(title.trim() || "Untitled case");
  };

  return (
    <>
      {/* Minimal header (brand + theme + sign out) */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: 66,
          padding: "0 clamp(14px,2.5vw,26px)",
          background: "var(--surface)",
          borderBottom: "1px solid var(--line)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
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
            <div style={{ fontFamily: "var(--font-serif)", fontWeight: 700, fontSize: 19, color: "var(--ink)" }}>
              D&rsquo;Law
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--ink-mute)" }}>
              Hearing Prep
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <button className="dl-icon-btn" onClick={toggleDark} title="Toggle theme" aria-label="Toggle theme">
            <Icon name={prefs.dark ? "light_mode" : "dark_mode"} />
          </button>
          <form action={signOut} style={{ display: "flex" }}>
            <button type="submit" className="dl-icon-btn" title="Sign out" aria-label="Sign out">
              <Icon name="logout" />
            </button>
          </form>
        </div>
      </header>

      {/* Centered create-first-case card */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "clamp(24px,5vw,64px) 20px",
        }}
      >
        <div
          className="dl-view"
          style={{
            width: "100%",
            maxWidth: 480,
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: 24,
            boxShadow: "var(--shadow-md)",
            padding: "clamp(26px,4vw,40px)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: 18,
              margin: "0 auto 18px",
              background: "var(--teal-soft)",
              color: "var(--teal-strong)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="folder_open" size={30} fill />
          </div>
          <div className="dl-eyebrow" style={{ marginBottom: 6 }}>
            Welcome, {greeting}
          </div>
          <h1 className="dl-h1" style={{ fontSize: "clamp(22px,3vw,28px)" }}>
            Create your first case
          </h1>
          <p className="dl-sub" style={{ margin: "10px auto 24px", maxWidth: 360 }}>
            Give your dispute a name to get started. You can rename it later and
            add as many cases as you need.
          </p>

          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input
              className="dl-field"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Refund for an undelivered laptop"
              autoFocus
              style={{ textAlign: "center" }}
            />
            <button type="submit" className="dl-btn dl-btn-primary" style={{ height: 50 }} disabled={busy}>
              {busy ? (
                <>
                  <span className="dl-spin" /> Creating…
                </>
              ) : (
                <>
                  <Icon name="add_circle" size={20} /> Create case
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
