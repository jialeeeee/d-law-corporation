import type { ReactNode } from "react";
import { INDICATIVE_NOTE } from "@/lib/sct/ruleset";
import "@/app/globals.css";

// Shared shell for public web pages (route group `(web)`). Carries the
// not-advice banner. P5 owner: surface each active feature as a step/tab here.
export default function WebLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "0 1.5rem" }}>
        <p className="notice">
          {INDICATIVE_NOTE}
        </p>
      </div>
    </>
  );
}