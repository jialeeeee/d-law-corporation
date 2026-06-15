"use client";

// The Hearing Prep workspace shell: persistent top bar + sidebar, the active
// view, the evidence slide-over and the global toast. View switching is local
// state (the design is a single-page view switch); data lives in the workspace
// store (database-backed). Renders nothing case-specific until hydrated.

import { useCallback, useEffect, useRef, useState } from "react";
import { useWorkspace } from "@/lib/store/WorkspaceProvider";
import type { ViewKey } from "@/lib/store/types";
import { UIProvider, type ToastData, Icon } from "./ui";
import { TopBar, type AppUser } from "./TopBar";
import { Sidebar } from "./Sidebar";
import { EvidenceSlideOver } from "./EvidenceSlideOver";
import { DashboardView } from "./views/DashboardView";
import { EvidenceView } from "./views/EvidenceView";
import { TimelineView } from "./views/TimelineView";
import { HearingsView } from "./views/HearingsView";
import { QaView } from "./views/QaView";
import { ExportView } from "./views/ExportView";
import { SettingsView } from "./views/SettingsView";

export function HearingPrepApp({ user }: { user?: AppUser }) {
  const { ready, prefs } = useWorkspace();
  const [view, setView] = useState<ViewKey>("dashboard");
  const [drawer, setDrawer] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [evSelected, setEvSelected] = useState<string | null>(null);
  const [width, setWidth] = useState(1280);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  const showToast = useCallback((msg: string, icon = "check_circle") => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, icon });
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  const navigate = useCallback((v: ViewKey) => {
    setView(v);
    setDrawer(false);
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }, []);

  const openEvidence = useCallback((id: string) => setEvSelected(id), []);

  const mobile = width < 900;

  return (
    <div id="dlapp" data-mode={prefs.dark ? "dark" : "light"}>
      <UIProvider value={{ view, setView: navigate, showToast, openEvidence }}>
        <TopBar user={user} mobile={mobile} onToggleDrawer={() => setDrawer((d) => !d)} />

        <div style={{ display: "flex", flex: 1, minHeight: 0, position: "relative" }}>
          {mobile && drawer && (
            <div
              onClick={() => setDrawer(false)}
              style={{
                position: "fixed",
                inset: "66px 0 0 0",
                zIndex: 55,
                background: "rgba(8,14,30,.5)",
                backdropFilter: "blur(2px)",
                animation: "dlFade .25s ease",
              }}
            />
          )}

          <Sidebar mobile={mobile} drawer={drawer} onNavigate={() => setDrawer(false)} />

          <main
            ref={contentRef}
            style={{ flex: 1, minWidth: 0, overflowY: "auto", overflowX: "hidden" }}
          >
            <div
              style={{
                maxWidth: 1280,
                margin: "0 auto",
                padding: "clamp(18px,3vw,40px) clamp(14px,3vw,40px) 80px",
              }}
            >
              {!ready ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 12,
                    minHeight: "50vh",
                    color: "var(--ink-mute)",
                  }}
                >
                  <span className="dl-spin" /> Loading your workspace…
                </div>
              ) : (
                <>
                  {view === "dashboard" && <DashboardView />}
                  {view === "evidence" && <EvidenceView />}
                  {view === "timeline" && <TimelineView />}
                  {view === "hearings" && <HearingsView />}
                  {view === "qa" && <QaView />}
                  {view === "export" && <ExportView />}
                  {view === "settings" && <SettingsView />}
                </>
              )}
            </div>
          </main>
        </div>

        <EvidenceSlideOver id={evSelected} onClose={() => setEvSelected(null)} />

        {toast && (
          <div
            style={{
              position: "fixed",
              left: "50%",
              bottom: 30,
              zIndex: 80,
              transform: "translateX(-50%)",
              display: "flex",
              alignItems: "center",
              gap: 11,
              padding: "14px 20px",
              borderRadius: 14,
              background: "var(--navy)",
              color: "#fff",
              boxShadow: "var(--shadow-lg)",
              animation: "dlPop .3s cubic-bezier(.16,1,.3,1) both",
            }}
          >
            <Icon name={toast.icon ?? "check_circle"} size={22} color="var(--teal)" fill />
            <span style={{ fontSize: 14.5, fontWeight: 600 }}>{toast.msg}</span>
          </div>
        )}
      </UIProvider>
    </div>
  );
}
