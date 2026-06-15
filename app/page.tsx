import Link from "next/link";
import { getCurrentUser } from "@/lib/supabase/server";

// Public landing page. Premium D'Law aesthetic (teal/navy, Spectral serif),
// auth-aware CTAs. The real app lives at /workspace (gated by middleware).
export default async function Home() {
  const user = await getCurrentUser();
  const loggedIn = Boolean(user);

  const features = [
    {
      icon: "cloud_upload",
      title: "Evidence, organised",
      body: "Upload chats, receipts, photos, PDFs and audio. AI reads each one, pulls out the text and the dates.",
    },
    {
      icon: "calendar_month",
      title: "One clear timeline",
      body: "Every dated event is merged into a single chronology — exactly what the Tribunal wants to see.",
    },
    {
      icon: "mic",
      title: "Script & Q&A rehearsal",
      body: "Get a plain-language hearing script and rehearse the questions you're likely to be asked.",
    },
    {
      icon: "picture_as_pdf",
      title: "Court-ready bundle",
      body: "Export a tidy, print-ready bundle with your cover sheet, evidence index and timeline.",
    },
  ];

  const steps = [
    { n: "1", title: "Add your evidence", body: "Drag in your files — we extract the facts." },
    { n: "2", title: "Review your case", body: "Check the timeline, key facts and readiness score." },
    { n: "3", title: "Walk in prepared", body: "Rehearse, tick the checklist, export your bundle." },
  ];

  return (
    <div id="dlapp" data-mode="light" style={{ minHeight: "100vh" }}>
      {/* ───────── Hero band ───────── */}
      <section
        style={{
          position: "relative",
          overflow: "hidden",
          color: "#fff",
          background:
            "radial-gradient(1000px 600px at 82% -12%, rgba(19,165,148,.25), transparent 60%)," +
            "radial-gradient(700px 460px at 0% 110%, rgba(19,165,148,.12), transparent 60%)," +
            "linear-gradient(180deg,#0a1430 0%,#0e1c40 100%)",
        }}
      >
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 clamp(16px,4vw,40px)" }}>
          {/* Nav */}
          <nav
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
              padding: "20px 0",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: "linear-gradient(145deg,#13a594,#0c8475)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontFamily: "var(--font-serif)",
                  fontWeight: 700,
                  fontSize: 24,
                  boxShadow: "0 8px 20px rgba(19,165,148,.45)",
                }}
              >
                D
              </div>
              <div style={{ lineHeight: 1.05 }}>
                <div style={{ fontFamily: "var(--font-serif)", fontWeight: 700, fontSize: 20 }}>
                  D&rsquo;Law
                </div>
                <div
                  style={{
                    fontSize: 10.5,
                    fontWeight: 600,
                    letterSpacing: ".16em",
                    textTransform: "uppercase",
                    color: "#aab6d6",
                  }}
                >
                  Hearing Prep
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {loggedIn ? (
                <Link href="/workspace" style={btnTeal}>
                  Open workspace
                </Link>
              ) : (
                <>
                  <Link href="/login" style={btnGhost}>
                    Log in
                  </Link>
                  <Link href="/register" style={btnTeal}>
                    Sign up
                  </Link>
                </>
              )}
            </div>
          </nav>

          {/* Hero content */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))",
              gap: "clamp(28px,4vw,56px)",
              alignItems: "center",
              padding: "clamp(36px,6vw,72px) 0 clamp(48px,7vw,90px)",
            }}
          >
            <div>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "7px 14px",
                  borderRadius: 30,
                  background: "rgba(19,165,148,.16)",
                  border: "1px solid rgba(19,165,148,.3)",
                  color: "#7ee6d4",
                  fontSize: 12.5,
                  fontWeight: 700,
                  letterSpacing: ".02em",
                  marginBottom: 22,
                }}
              >
                <span className="msr" style={{ fontSize: 17 }}>
                  gavel
                </span>
                Small Claims Tribunal · Singapore
              </div>
              <h1
                style={{
                  fontFamily: "var(--font-serif)",
                  fontWeight: 600,
                  fontSize: "clamp(34px,5vw,56px)",
                  lineHeight: 1.05,
                  letterSpacing: "-0.02em",
                  margin: 0,
                }}
              >
                Walk into your hearing
                <br />
                <span style={{ color: "#37d6c0" }}>fully prepared.</span>
              </h1>
              <p
                style={{
                  fontSize: "clamp(15px,1.6vw,18px)",
                  lineHeight: 1.6,
                  color: "#c2cce6",
                  maxWidth: 520,
                  margin: "18px 0 28px",
                }}
              >
                D&rsquo;Law turns your own account into a clear, court-ready case —
                organise evidence, build your timeline, rehearse your script, and
                export a tidy bundle. No legal jargon.
              </p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <Link href={loggedIn ? "/workspace" : "/register"} style={{ ...btnTeal, height: 52, padding: "0 26px", fontSize: 16 }}>
                  {loggedIn ? "Go to your workspace" : "Get started — it's free"}
                  <span className="msr" style={{ fontSize: 20 }}>
                    arrow_forward
                  </span>
                </Link>
                {!loggedIn && (
                  <Link href="/login" style={{ ...btnGhost, height: 52, padding: "0 24px", fontSize: 16 }}>
                    Log in
                  </Link>
                )}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 18,
                  marginTop: 30,
                  flexWrap: "wrap",
                  color: "#8696bb",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                  <span className="msr" style={{ fontSize: 18, color: "#28b481" }}>
                    shield_lock
                  </span>
                  Private to you
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                  <span className="msr" style={{ fontSize: 18, color: "#28b481" }}>
                    bolt
                  </span>
                  Ready in minutes
                </span>
              </div>
            </div>

            {/* Floating preview card */}
            <div style={{ display: "flex", justifyContent: "center" }}>
              <div
                style={{
                  width: "100%",
                  maxWidth: 380,
                  background: "var(--surface)",
                  border: "1px solid var(--line)",
                  borderRadius: 24,
                  boxShadow: "0 40px 90px rgba(3,8,22,.55)",
                  padding: 26,
                  color: "var(--ink)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 22 }}>
                  <div style={{ position: "relative", width: 92, height: 92, flex: "0 0 auto" }}>
                    <svg viewBox="0 0 120 120" style={{ width: 92, height: 92, transform: "rotate(-90deg)" }}>
                      <circle cx="60" cy="60" r="52" fill="none" stroke="var(--surface-3)" strokeWidth="13" />
                      <circle
                        cx="60"
                        cy="60"
                        r="52"
                        fill="none"
                        stroke="url(#hgrad)"
                        strokeWidth="13"
                        strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 52}
                        strokeDashoffset={2 * Math.PI * 52 * (1 - 0.82)}
                      />
                      <defs>
                        <linearGradient id="hgrad" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0" stopColor="#13a594" />
                          <stop offset="1" stopColor="#37d6c0" />
                        </linearGradient>
                      </defs>
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
                      <div style={{ fontFamily: "var(--font-serif)", fontSize: 24, fontWeight: 700 }}>82</div>
                      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".1em", color: "var(--ink-mute)" }}>
                        READY
                      </div>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontFamily: "var(--font-serif)", fontSize: 17, fontWeight: 600 }}>
                      Hearing readiness
                    </div>
                    <div style={{ fontSize: 13, color: "var(--ink-soft)", fontWeight: 500 }}>
                      You&rsquo;re almost there
                    </div>
                  </div>
                </div>
                {[
                  { icon: "cloud_upload", label: "Evidence collected", done: true },
                  { icon: "calendar_month", label: "Timeline built", done: true },
                  { icon: "menu_book", label: "Script reviewed", done: true },
                  { icon: "checklist", label: "Checklist", done: false },
                ].map((r) => (
                  <div
                    key={r.label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 11,
                      padding: "10px 12px",
                      borderRadius: 12,
                      background: "var(--surface-2)",
                      marginBottom: 8,
                    }}
                  >
                    <span className="msr fill" style={{ fontSize: 20, color: r.done ? "var(--green)" : "var(--ink-mute)" }}>
                      {r.done ? "check_circle" : "radio_button_unchecked"}
                    </span>
                    <span style={{ fontSize: 13.5, fontWeight: 600, flex: 1 }}>{r.label}</span>
                    <span className="msr" style={{ fontSize: 18, color: "var(--teal)" }}>
                      {r.icon}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───────── Features ───────── */}
      <section style={{ maxWidth: 1180, margin: "0 auto", padding: "clamp(44px,6vw,84px) clamp(16px,4vw,40px)" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div className="dl-eyebrow" style={{ marginBottom: 8 }}>
            Everything in one place
          </div>
          <h2 style={{ fontFamily: "var(--font-serif)", fontWeight: 600, fontSize: "clamp(24px,3vw,34px)", letterSpacing: "-0.02em", margin: 0, color: "var(--ink)" }}>
            From a pile of files to a hearing plan
          </h2>
        </div>
        <div className="dl-grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))" }}>
          {features.map((f) => (
            <div key={f.title} className="dl-card dl-lift" style={{ padding: 24 }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 15,
                  background: "linear-gradient(145deg,var(--teal),var(--teal-strong))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  marginBottom: 16,
                  boxShadow: "0 8px 18px rgba(19,165,148,.3)",
                }}
              >
                <span className="msr fill" style={{ fontSize: 26 }}>
                  {f.icon}
                </span>
              </div>
              <h3 style={{ fontFamily: "var(--font-serif)", fontSize: 19, fontWeight: 600, margin: "0 0 8px", color: "var(--ink)" }}>
                {f.title}
              </h3>
              <p style={{ fontSize: 14, lineHeight: 1.55, color: "var(--ink-soft)", margin: 0, fontWeight: 500 }}>
                {f.body}
              </p>
            </div>
          ))}
        </div>

        {/* Steps */}
        <div style={{ marginTop: "clamp(40px,6vw,72px)" }}>
          <div className="dl-grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))" }}>
            {steps.map((s) => (
              <div key={s.n} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    flex: "0 0 auto",
                    borderRadius: "50%",
                    background: "var(--teal-soft)",
                    color: "var(--teal-strong)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "var(--font-serif)",
                    fontWeight: 700,
                    fontSize: 18,
                  }}
                >
                  {s.n}
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, margin: "4px 0 4px", color: "var(--ink)" }}>{s.title}</h3>
                  <p style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--ink-soft)", margin: 0, fontWeight: 500 }}>
                    {s.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA band */}
        <div
          style={{
            marginTop: "clamp(44px,6vw,80px)",
            borderRadius: 24,
            padding: "clamp(28px,4vw,48px)",
            textAlign: "center",
            color: "#fff",
            background:
              "radial-gradient(700px 300px at 50% -40%, rgba(19,165,148,.3), transparent 60%)," +
              "linear-gradient(140deg,#0c8475,#0a1430)",
            boxShadow: "var(--shadow-md)",
          }}
        >
          <h2 style={{ fontFamily: "var(--font-serif)", fontWeight: 600, fontSize: "clamp(22px,3vw,30px)", margin: "0 0 10px" }}>
            Ready to prepare your case?
          </h2>
          <p style={{ color: "#cdd6ee", fontSize: 15, maxWidth: 480, margin: "0 auto 22px", lineHeight: 1.55 }}>
            Create your workspace and start organising in minutes.
          </p>
          <Link
            href={loggedIn ? "/workspace" : "/register"}
            style={{ ...btnTeal, height: 52, padding: "0 28px", fontSize: 16, display: "inline-flex" }}
          >
            {loggedIn ? "Open workspace" : "Get started"}
            <span className="msr" style={{ fontSize: 20 }}>
              arrow_forward
            </span>
          </Link>
        </div>
      </section>

      {/* ───────── Footer ───────── */}
      <footer
        style={{
          borderTop: "1px solid var(--line)",
          padding: "28px clamp(16px,4vw,40px)",
          textAlign: "center",
        }}
      >
        <p style={{ fontSize: 12.5, color: "var(--ink-mute)", lineHeight: 1.6, maxWidth: 700, margin: "0 auto" }}>
          D&rsquo;Law helps you organise your own facts for the Small Claims Tribunal.
          It is information, not legal advice, and does not predict any outcome. The
          official CJTS pre-filing assessment and the Tribunal are the authority.
        </p>
      </footer>
    </div>
  );
}

const btnTeal: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  height: 42,
  padding: "0 18px",
  borderRadius: 12,
  background: "linear-gradient(140deg,#13a594,#0c8475)",
  color: "#fff",
  fontWeight: 700,
  fontSize: 14.5,
  textDecoration: "none",
  boxShadow: "0 10px 24px rgba(19,165,148,.32)",
};

const btnGhost: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  height: 42,
  padding: "0 18px",
  borderRadius: 12,
  background: "rgba(255,255,255,.06)",
  border: "1px solid rgba(255,255,255,.18)",
  color: "#fff",
  fontWeight: 700,
  fontSize: 14.5,
  textDecoration: "none",
};
