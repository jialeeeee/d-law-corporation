import type { ReactNode } from "react";
import { INDICATIVE_NOTE } from "@/lib/sct/ruleset";

// Shared shell for public web pages (route group `(web)`). Carries the
// not-advice banner. P5 owner: surface each active feature as a step/tab here.
export default function WebLayout({ children }: { children: ReactNode }) {
  return (
    <main>
      {children}
      <p className="notice" style={{ marginTop: "2rem" }}>
        {INDICATIVE_NOTE}
      </p>
    </main>
  );
}
